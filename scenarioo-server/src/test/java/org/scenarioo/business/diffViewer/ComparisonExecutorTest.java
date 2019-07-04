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

package org.scenarioo.business.diffViewer;

import org.apache.commons.io.FileUtils;
import org.junit.Before;
import org.junit.BeforeClass;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.Mock;
import org.mockito.runners.MockitoJUnitRunner;
import org.scenarioo.api.ScenarioDocuReader;
import org.scenarioo.api.files.ObjectFromDirectory;
import org.scenarioo.business.builds.AliasResolver;
import org.scenarioo.model.configuration.ComparisonConfiguration;
import org.scenarioo.model.configuration.Configuration;
import org.scenarioo.model.docu.entities.Build;
import org.scenarioo.model.docu.entities.Status;
import org.scenarioo.repository.RepositoryLocator;
import org.scenarioo.rest.base.BuildIdentifier;
import org.scenarioo.utils.TestFileUtils;
import org.scenarioo.utils.TestResourceFile;

import java.io.File;
import java.io.IOException;
import java.util.Calendar;
import java.util.Date;
import java.util.LinkedList;
import java.util.List;
import java.util.concurrent.ThreadPoolExecutor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.Assert.*;
import static org.mockito.Mockito.when;
import static org.scenarioo.business.diffViewer.comparator.ConfigurationFixture.getComparisonConfiguration;

@RunWith(MockitoJUnitRunner.class)
public class ComparisonExecutorTest {

	private static int NUMBER_OF_COMPARISONS_FOR_BRANCH_1 = 5;
	private static int NUMBER_OF_COMPARISONS_FOR_BRANCH_2 = 2;
	private static File ROOT_DIRECTORY = new File("tmpDir");
	private static String BRANCH_NAME_1 = "branch1";
	private static String BRANCH_NAME_2 = "branch2";
	private static String BUILD_NAME_1 = "build1";
	private static String BUILD_NAME_2 = "build2";
	private static String BUILD_NAME_3 = "build3";
	private static String BUILD_NAME_ALIAS_LAST_SUCCESSFUL = "last successful";
	private static String BUILD_NAME_ALIAS_MOST_RECENT = "most recent";
	private static String COMPARISON_NAME = "comparison";

	private static String ALL_BRANCHES_REGEXP = "branch.*";

	private static ComparisonConfiguration comparisonConfiguration1;
	private static ComparisonConfiguration comparisonConfiguration2;
	private static ComparisonConfiguration comparisonConfiguration3;
	private static ComparisonConfiguration comparisonConfiguration4;
	private static ComparisonConfiguration comparisonConfiguration5WithRegexp;
	private static ComparisonConfiguration comparisonConfiguration6;

	private static ComparisonConfiguration comparisonConfiguration5MatchedForBranch1;
	private static ComparisonConfiguration comparisonConfiguration5MatchedForBranch2;

	private Build build1 = getBuild(BUILD_NAME_1, Status.SUCCESS, getDateBeforeDays(0));
	private Build build2 = getBuild(BUILD_NAME_2, Status.FAILED, getDateBeforeDays(1));
	private Build build3 = getBuild(BUILD_NAME_3, Status.SUCCESS, getDateBeforeDays(2));

	@Mock
	private ThreadPoolExecutor threadPoolExecutor;

	@Mock
	private AliasResolver aliasResolver;

	@Mock
	private ScenarioDocuReader docuReader;

	private ComparisonExecutor comparisonExecutor;

	@BeforeClass
	public static void setUpClass() throws IOException {
		TestFileUtils.createFolderAndSetItAsRootInConfigurationForUnitTest(ROOT_DIRECTORY);
		copyBuildXml(BUILD_NAME_1);
		copyBuildXml(BUILD_NAME_2);
		copyBuildXml(BUILD_NAME_3);

		comparisonConfiguration1 = getComparisonConfiguration(BRANCH_NAME_1,
			BRANCH_NAME_1, BUILD_NAME_ALIAS_LAST_SUCCESSFUL, COMPARISON_NAME);
		comparisonConfiguration2 = getComparisonConfiguration(BRANCH_NAME_1,
			BRANCH_NAME_1, BUILD_NAME_ALIAS_MOST_RECENT, COMPARISON_NAME);
		comparisonConfiguration3 = getComparisonConfiguration(BRANCH_NAME_1,
			BRANCH_NAME_2, BUILD_NAME_ALIAS_LAST_SUCCESSFUL, COMPARISON_NAME);
		comparisonConfiguration4 = getComparisonConfiguration(BRANCH_NAME_1,
			BRANCH_NAME_1, BUILD_NAME_1, COMPARISON_NAME);
		comparisonConfiguration5WithRegexp = getComparisonConfiguration(ALL_BRANCHES_REGEXP,
			BRANCH_NAME_2, BUILD_NAME_2, COMPARISON_NAME);
		comparisonConfiguration6 = getComparisonConfiguration(BRANCH_NAME_2,
			BRANCH_NAME_2, BUILD_NAME_3, COMPARISON_NAME);

		comparisonConfiguration5MatchedForBranch1 = getComparisonConfiguration(BRANCH_NAME_1,
			BRANCH_NAME_2, BUILD_NAME_2, COMPARISON_NAME);
		comparisonConfiguration5MatchedForBranch2 = getComparisonConfiguration(BRANCH_NAME_2,
			BRANCH_NAME_2, BUILD_NAME_2, COMPARISON_NAME);

		RepositoryLocator.INSTANCE.getConfigurationRepository().updateConfiguration(getTestConfiguration());
	}

	private static void copyBuildXml(String buildName) throws IOException {
		File buildFolder = new File(ROOT_DIRECTORY, BRANCH_NAME_1+"/"+ buildName);
		buildFolder.mkdirs();
		File buildxml = TestResourceFile.getResourceFile("org/scenarioo/business/diffViewer/"+buildName+"_build.xml");
		FileUtils.copyFile(buildxml, new File(buildFolder, "build.xml"));
	}

	@Before
	public void setUp() {
		when(aliasResolver.resolveBranchAlias(BRANCH_NAME_1)).thenReturn(BRANCH_NAME_1);
		when(aliasResolver.resolveBranchAlias(BRANCH_NAME_2)).thenReturn(BRANCH_NAME_2);
		when(aliasResolver.resolveBranchAlias(ALL_BRANCHES_REGEXP)).thenReturn(ALL_BRANCHES_REGEXP);

		when(aliasResolver.resolveBranchAndBuildAliases(BRANCH_NAME_1, BUILD_NAME_1))
			.thenReturn(new BuildIdentifier(BRANCH_NAME_1, BUILD_NAME_1));
		when(aliasResolver.resolveBranchAndBuildAliases(BRANCH_NAME_1, BUILD_NAME_2))
			.thenReturn(new BuildIdentifier(BRANCH_NAME_1, BUILD_NAME_2));
		when(aliasResolver.resolveBranchAndBuildAliases(BRANCH_NAME_1, BUILD_NAME_3))
			.thenReturn(new BuildIdentifier(BRANCH_NAME_1, BUILD_NAME_3));
		when(aliasResolver.resolveBranchAndBuildAliases(BRANCH_NAME_2, BUILD_NAME_ALIAS_LAST_SUCCESSFUL))
			.thenReturn(new BuildIdentifier(BRANCH_NAME_2, BUILD_NAME_1));
		when(aliasResolver.resolveBranchAndBuildAliases(BRANCH_NAME_2, BUILD_NAME_2))
			.thenReturn(new BuildIdentifier(BRANCH_NAME_2, BUILD_NAME_2));
		when(aliasResolver.resolveBranchAndBuildAliases(BRANCH_NAME_2, BUILD_NAME_3))
			.thenReturn(new BuildIdentifier(BRANCH_NAME_2, BUILD_NAME_3));

		when(docuReader.loadBuild(BRANCH_NAME_1, BUILD_NAME_1)).thenReturn(build1);
		when(docuReader.loadBuild(BRANCH_NAME_1, BUILD_NAME_2)).thenReturn(build2);
		when(docuReader.loadBuild(BRANCH_NAME_1, BUILD_NAME_3)).thenReturn(build3);

		when(docuReader.loadBuilds(BRANCH_NAME_1)).thenReturn(getBuilds());

		this.comparisonExecutor = new ComparisonExecutor(threadPoolExecutor, aliasResolver);
	}

	@Test
	public void testGetComparisonConfigurationsForBaseBranch1() {
		List<ComparisonConfiguration> result = comparisonExecutor
			.getComparisonConfigurationsForBaseBranch(BRANCH_NAME_1);
		assertEquals(NUMBER_OF_COMPARISONS_FOR_BRANCH_1, result.size());
		assertThat(result.get(0)).isEqualToComparingFieldByField(comparisonConfiguration1);
		assertThat(result.get(1)).isEqualToComparingFieldByField(comparisonConfiguration2);
		assertThat(result.get(2)).isEqualToComparingFieldByField(comparisonConfiguration3);
		assertThat(result.get(3)).isEqualToComparingFieldByField(comparisonConfiguration4);
		assertThat(result.get(4)).isEqualToComparingFieldByField(comparisonConfiguration5MatchedForBranch1);
	}

	@Test
	public void testGetComparisonConfigurationsForBaseBranch2() {
		List<ComparisonConfiguration> result = comparisonExecutor
			.getComparisonConfigurationsForBaseBranch(BRANCH_NAME_2);
		assertEquals(NUMBER_OF_COMPARISONS_FOR_BRANCH_2, result.size());
		assertThat(result.get(0)).isEqualToComparingFieldByField(comparisonConfiguration5MatchedForBranch2);
		assertThat(result.get(1)).isEqualToComparingFieldByField(comparisonConfiguration6);
	}

	@Test
	public void testResolveComparisonConfigurationLastSuccessfulSameBranch() {
		ComparisonConfiguration result = comparisonExecutor.resolveComparisonConfiguration(
			comparisonConfiguration1, BUILD_NAME_3);
		assertEquals(BRANCH_NAME_1, result.getBaseBranchName());
		assertEquals(BRANCH_NAME_1, result.getComparisonBranchName());
		assertEquals(BUILD_NAME_1, result.getComparisonBuildName());
	}

	@Test
	public void testResolveComparisonConfigurationMostRecentSameBranch() {
		ComparisonConfiguration result = comparisonExecutor.resolveComparisonConfiguration(
			comparisonConfiguration2, BUILD_NAME_3);
		assertEquals(BRANCH_NAME_1, result.getBaseBranchName());
		assertEquals(BRANCH_NAME_1, result.getComparisonBranchName());
		assertEquals(BUILD_NAME_2, result.getComparisonBuildName());
	}

	@Test
	public void testResolveComparisonConfigurationLastSuccessfulOtherBranch() {
		ComparisonConfiguration result = comparisonExecutor.resolveComparisonConfiguration(
			comparisonConfiguration3, BUILD_NAME_2);
		assertEquals(BRANCH_NAME_1, result.getBaseBranchName());
		assertEquals(BRANCH_NAME_2, result.getComparisonBranchName());
		assertEquals(BUILD_NAME_1, result.getComparisonBuildName());
	}

	@Test
	public void testResolveComparisonConfigurationSameBranchAndSameBuild() {
		ComparisonConfiguration result = comparisonExecutor.resolveComparisonConfiguration(
			comparisonConfiguration4, BUILD_NAME_1);
		assertNull(result);
	}

	@Test
	public void testResolveComparisonConfigurationSameBranchAndBuildWithoutAlias() {

		ComparisonConfiguration  config = getComparisonConfiguration(BRANCH_NAME_1,
			BRANCH_NAME_2, BUILD_NAME_2, COMPARISON_NAME);

		ComparisonConfiguration result = comparisonExecutor.resolveComparisonConfiguration(
			config, BUILD_NAME_1);
		assertEquals(BRANCH_NAME_1, result.getBaseBranchName());
		assertEquals(BRANCH_NAME_2, result.getComparisonBranchName());
		assertEquals(BUILD_NAME_2, result.getComparisonBuildName());
	}

	@Test
	public void testResolveComparisonConfigurationOtherBranchAndBuildWithoutAlias() {
		ComparisonConfiguration result = comparisonExecutor.resolveComparisonConfiguration(
			comparisonConfiguration6, BUILD_NAME_1);
		assertEquals(BRANCH_NAME_2, result.getBaseBranchName());
		assertEquals(BRANCH_NAME_2, result.getComparisonBranchName());
		assertEquals(BUILD_NAME_3, result.getComparisonBuildName());
	}

	@Test
	public void testAreAllComparisonCalculationsFinishedWithNoRunningThreadsReturnsTrue() {
		when(threadPoolExecutor.getActiveCount()).thenReturn(0);

		assertTrue(comparisonExecutor.areAllComparisonCalculationsFinished());
	}

	@Test
	public void testAreAllComparisonCalculationsFinishedWithRunningThreadsReturnsFalse() {
		when(threadPoolExecutor.getActiveCount()).thenReturn(1);

		assertFalse(comparisonExecutor.areAllComparisonCalculationsFinished());
	}

	private static Configuration getTestConfiguration() {

		List<ComparisonConfiguration> comparisonConfigurations = new LinkedList<>();
		comparisonConfigurations.add(comparisonConfiguration1);
		comparisonConfigurations.add(comparisonConfiguration2);
		comparisonConfigurations.add(comparisonConfiguration3);
		comparisonConfigurations.add(comparisonConfiguration4);
		comparisonConfigurations.add(comparisonConfiguration5WithRegexp);
		comparisonConfigurations.add(comparisonConfiguration6);

		Configuration configuration = RepositoryLocator.INSTANCE.getConfigurationRepository().getConfiguration();
		configuration.setComparisonConfigurations(comparisonConfigurations);

		return configuration;
	}

	private Build getBuild(String name, Status status, Date date) {
		Build build = new Build(name);
		build.setDate(date);
		build.setStatus(status);
		return build;
	}

	private Date getDateBeforeDays(int days) {
		Calendar calendar = Calendar.getInstance();
		calendar.add(Calendar.DAY_OF_MONTH, -days);
		return calendar.getTime();
	}

	private List<ObjectFromDirectory<Build>> getBuilds() {
		List<ObjectFromDirectory<Build>> builds = new LinkedList<>();
		builds.add(new ObjectFromDirectory<>(build1, ROOT_DIRECTORY.getName()));
		builds.add(new ObjectFromDirectory<>(build2, ROOT_DIRECTORY.getName()));
		builds.add(new ObjectFromDirectory<>(build3, ROOT_DIRECTORY.getName()));
		return builds;
	}

}
