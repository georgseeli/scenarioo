/* scenarioo-server
 * Copyright (C) 2014, scenarioo.org Development Team
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

package org.scenarioo.business.builds;

import org.apache.log4j.Logger;
import org.scenarioo.api.ScenarioDocuReader;
import org.scenarioo.business.aggregator.ScenarioDocuAggregator;
import org.scenarioo.dao.aggregates.AggregatedDocuDataReader;
import org.scenarioo.dao.aggregates.ScenarioDocuAggregationDao;
import org.scenarioo.dao.search.FullTextSearch;
import org.scenarioo.model.diffViewer.BuildDiffInfo;
import org.scenarioo.model.docu.aggregates.branches.BranchBuilds;
import org.scenarioo.model.docu.aggregates.branches.BuildImportStatus;
import org.scenarioo.model.docu.aggregates.branches.BuildImportSummary;
import org.scenarioo.model.docu.aggregates.objects.LongObjectNamesResolver;
import org.scenarioo.model.docu.entities.Branch;
import org.scenarioo.repository.ConfigurationRepository;
import org.scenarioo.repository.RepositoryLocator;
import org.scenarioo.rest.base.BuildIdentifier;

import java.io.File;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Future;

/**
 * <p>
 * Manages the list of branches and builds that are currently available in the documentation directory:
 * </p>
 * <ul>
 * <li>
 * 1. Using {@link #updateAllBuildsAndSubmitNewBuildsForImport(File)}()} all branches and builds are read and processed from
 * the file system, this will calculate any aggregated data using {@link ScenarioDocuAggregator}.</li>
 * <li>
 * 2. The manager knows all available builds and their states of import, that can be accessed using
 * {@link #getBuildImportSummaries()}.</li>
 * <li>
 * 3. The current (last processed) list of all successfully imported branches and builds is cached and can be accessed
 * using {@link #getAvailableBuilds()}.</li>
 * </ul>
 */
public class ScenarioDocuBuildsManager implements AliasResolver {

	private static ScenarioDocuBuildsManager INSTANCE;

	private static final Logger LOGGER = Logger.getLogger(ScenarioDocuBuildsManager.class);

	/**
	 * Cached long object name resolver for most recently loaded builds and branches. Is cleared whenever new builds are
	 * imported.
	 */
	private final Map<BuildIdentifier, LongObjectNamesResolver> longObjectNamesResolvers = new HashMap<BuildIdentifier, LongObjectNamesResolver>();

	/**
	 * Only the successfully imported builds that are available and can be accessed.
	 */
	private final AvailableBuildsList availableBuilds = new AvailableBuildsList();

	/**
	 * Importer to hold current state of all builds and to import those that are not yet imported or are outdated.
	 */
	private final BuildImporter buildImporter = new BuildImporter();

	/**
	 * Is a singleton. Use {@link #getInstance()}.
	 */
	private ScenarioDocuBuildsManager() {
	}

	public static ScenarioDocuBuildsManager getInstance() {
		if(INSTANCE == null) {
			synchronized (ScenarioDocuBuildsManager.class) {
				if(INSTANCE == null) {
					INSTANCE = new ScenarioDocuBuildsManager();
				}
			}
		}
		return INSTANCE;
	}

	/**
	 * Get branch builds list with those builds that are currently available (have been already successfully imported).
	 *
	 * This list also contains aliases for most recent and last successful builds (which might be the same).
	 */
	public List<BranchBuilds> getAvailableBuilds() {
		return availableBuilds.getBranchBuildsList();
	}

	public void refreshBranchAliases() {
		availableBuilds.refreshAliases();
	}

	/**
	 * Summaries about current states of all builds.
	 */
	public List<BuildImportSummary> getBuildImportSummaries() {
		return buildImporter.getBuildImportSummariesAsList();
	}

	/**
	 * Resolves a potential alias build name but does not fail if build name is not recognized or not successful
	 */
	public String resolveAliasBuildNameUnchecked(final String branchName, final String buildName) {
		return availableBuilds.resolveAliasBuildName(branchName, buildName);
	}

	/**
	 * Resolves branch and build names that might be aliases to their real names.
	 */
	@Override
	public BuildIdentifier resolveBranchAndBuildAliases(final String branchName, final String buildName) {
		String resolvedBranchName = this.resolveBranchAlias(branchName);
		String resolvedBuildName = resolveBuildAlias(resolvedBranchName, buildName);

		return new BuildIdentifier(resolvedBranchName, resolvedBuildName);
	}

	@Override
	public String resolveBranchAlias(String aliasOrRealBranchName) {
		return new BranchAliasResolver().resolveBranchAlias(aliasOrRealBranchName);
	}

	/**
	 * Resolves possible alias names in 'buildName' for managed build alias links. Also validates that the passed branch
	 * and build represents a valid build (imported successfully otherwise an exception is thrown)
	 *
	 * @return the name to use as build name for referencing this build.
	 */
	private String resolveBuildAlias(final String branchName, final String buildName) {
		String resolvedBuildName = resolveAliasBuildNameUnchecked(branchName, buildName);
		validateBuildIsSuccessfullyImported(branchName, resolvedBuildName);
		return resolvedBuildName;
	}

	/**
	 * Processes the content of configured documentation filesystem directory discovering newly added builds or branches
	 * to calculate all data for them. Also updates the branches and builds list.
	 *
	 * This method should be called on server startup and whenever something on the filesystem changed.
	 *
	 * The calculation/importing/aggregating of the builds is scheduled to be done in a separate thread/executor.
	 */
	public void updateBuildsIfValidDirectoryConfigured() {
		LOGGER.info("********************* update builds ********************************");
		LOGGER.info("Updating available builds ...");
		File docuDirectory = getConfigurationRepository().getDocumentationDataDirectory();
		if (docuDirectory == null) {
			LOGGER.error("No documentation directory is configured.");
			LOGGER.error("Please configure valid documentation directory in configuration UI");
		} else if (!docuDirectory.exists()) {
			LOGGER.error("No valid documentation directory is configured: " + docuDirectory.getAbsolutePath());
			LOGGER.error("Please configure valid documentation directory in configuration UI");
		} else {
			updateAllBuildsAndSubmitNewBuildsForImport(docuDirectory);
		}
		LOGGER.info("******************** update finished *******************************");
	}

	private void updateAllBuildsAndSubmitNewBuildsForImport(File docuDirectory) {
		LOGGER.info("  Processing documentation content data in directory: " + docuDirectory.getAbsoluteFile());
		updateBuildImportStatesAndAvailableBuildsList();
		longObjectNamesResolvers.clear();
		buildImporter.submitUnprocessedBuildsForImport(availableBuilds);

		new FullTextSearch().updateAvailableBuilds(buildImporter.getBuildImportSummariesAsList());
	}

	private synchronized void updateBuildImportStatesAndAvailableBuildsList() {
		LOGGER.info("Updating the list of available builds and their states ...");
		Map<BuildIdentifier, BuildImportSummary> loadedBuildImportSummaries = loadBuildImportSummaries();
		List<BranchBuilds> branchBuildsList = loadBranchBuildsList();
		buildImporter.updateBuildImportStates(branchBuildsList, loadedBuildImportSummaries);
		availableBuilds.updateBuildsWithSuccessfullyImportedBuilds(branchBuildsList,
				buildImporter.getBuildImportSummaries());
	}

	public static Map<BuildIdentifier, BuildImportSummary> loadBuildImportSummaries() {
		AggregatedDocuDataReader dao = new ScenarioDocuAggregationDao(
			getConfigurationRepository().getDocumentationDataDirectory());
		List<BuildImportSummary> loadedSummaries = dao.loadBuildImportSummaries();
		Map<BuildIdentifier, BuildImportSummary> result = new HashMap<BuildIdentifier, BuildImportSummary>();
		for (BuildImportSummary buildImportSummary : loadedSummaries) {
			result.put(buildImportSummary.getIdentifier(), buildImportSummary);
		}
		return result;
	}

	public static List<BranchBuilds> loadBranchBuildsList() {
		File documentationDataDirectory = getConfigurationRepository().getDocumentationDataDirectory();
		final ScenarioDocuReader reader = new ScenarioDocuReader(documentationDataDirectory);
		AggregatedDocuDataReader aggregatedDataReader = new ScenarioDocuAggregationDao(documentationDataDirectory);

		List<BranchBuilds> result = new ArrayList<BranchBuilds>();
		List<Branch> branches = reader.loadBranches();
		for (Branch branch : branches) {
			try {
				BranchBuilds branchBuilds = new BranchBuilds();
				branchBuilds.setBranch(branch);
				branchBuilds.setBuilds(aggregatedDataReader.loadBuildLinks(branch.getName()));
				result.add(branchBuilds);
			} catch (RuntimeException e) {
				LOGGER.error("Could not load builds from branch with name '" + branch.getName() + "' - this branch is corrupt in file system - will be ignored.", e);
			}
		}

		return result;
	}

	/**
	 * Schedule a build for re-import, even if the build was already imported once.
	 */
	public void reimportBuild(final BuildIdentifier buildIdentifier) {
		buildImporter.submitBuildForReimport(availableBuilds, buildIdentifier);
	}

	/**
	 * Schedule import of build (if new) and once it was imported also schedule a comparison to be calculated on that same build.
	 * @return buildDiffInfo as a double future ;-) - because waiting on a result from an asynchronous computation that triggers another asynchronous computation now ;-)
	 */
	public Future<Future<BuildDiffInfo>> importBuildIfNewAndScheduleHiPrioComparison(final BuildIdentifier buildIdentifier,
																					 final BuildIdentifier comparisonBuildIdentifier,
																					 String comparisonName) {
		return buildImporter.importBuildIfNewAndScheduleHiPrioComparison(availableBuilds, buildIdentifier, comparisonBuildIdentifier, comparisonName);
	}

	public void submitBuildForSingleComparison(final BuildIdentifier buildIdentifier, final BuildIdentifier comparisonBuildIdentifier, String comparisonName) {
		buildImporter.submitSingleBuildComparison(buildIdentifier, comparisonBuildIdentifier, comparisonName);
	}

	public LongObjectNamesResolver getLongObjectNameResolver(final BuildIdentifier buildIdentifier) {
		AggregatedDocuDataReader dao = new ScenarioDocuAggregationDao(
			getConfigurationRepository().getDocumentationDataDirectory());
		validateBuildIsSuccessfullyImported(buildIdentifier.getBranchName(), buildIdentifier.getBuildName());
		LongObjectNamesResolver longObjectNamesResolver = longObjectNamesResolvers.get(buildIdentifier);
		if (longObjectNamesResolver == null) {
			longObjectNamesResolver = dao.loadLongObjectNamesIndex(buildIdentifier);
			longObjectNamesResolvers.put(buildIdentifier, longObjectNamesResolver);
		}
		return longObjectNamesResolver;
	}

	/**
	 * Throws an exception if the passed build is unavailable or not yet properly imported. Only passes if the build has
	 * status {@link BuildImportStatus#SUCCESS}
	 */
	public void validateBuildIsSuccessfullyImported(final String branchName, final String buildName) {
		BuildIdentifier buildId = new BuildIdentifier(branchName, buildName);
		BuildImportSummary buildState = buildImporter.getBuildImportSummaries().get(buildId);
		if (buildState == null || !buildState.getStatus().isSuccess()) {
			throw new IllegalArgumentException("Not possible to access this build " + buildId
					+ ". It is unavailable, or not yet imported or updated successfully.");
		}
	}

	public BuildImportStatus getImportStatus(BuildIdentifier buildIdentifier) {
		return buildImporter.getBuildImportStatus(buildIdentifier);
	}

	/**
	 * @return <code>true</code> if no builds are being imported and no comparisons are being calculated.
	 */
	public boolean areAllImportsAndComparisonCalculationsFinished() {
		return buildImporter.areAllImportsAndComparisonCalculationsFinished();
	}

	private static ConfigurationRepository getConfigurationRepository() {
		return RepositoryLocator.INSTANCE.getConfigurationRepository();
	}

	/**
	 * Should only be used by Integration Tests to ensure that the correct configuration directory is used.
	 */
	public static void resetInstance() {
		INSTANCE = null;
	}
}
