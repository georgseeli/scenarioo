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

package org.scenarioo.model.diffViewer;

import org.scenarioo.model.configuration.ComparisonConfiguration;
import org.scenarioo.rest.base.BuildIdentifier;

import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlRootElement;

@XmlRootElement
@XmlAccessorType(XmlAccessType.FIELD)
public class ComparisonResult {

	private BuildIdentifier baseBuild;
	private BuildIdentifier compareBuild;

	ComparisonConfiguration comparisonConfiguration;

	private String rmaePercentage;

	public BuildIdentifier getBaseBuild() {
		return baseBuild;
	}

	public void setBaseBuild(BuildIdentifier baseBuild) {
		this.baseBuild = baseBuild;
	}

	public BuildIdentifier getCompareBuild() {
		return compareBuild;
	}

	public void setCompareBuild(BuildIdentifier compareBuild) {
		this.compareBuild = compareBuild;
	}

	public ComparisonConfiguration getComparisonConfiguration() {
		return comparisonConfiguration;
	}

	public void setComparisonConfiguration(ComparisonConfiguration comparisonConfiguration) {
		this.comparisonConfiguration = comparisonConfiguration;
	}

	public String getRmaePercentage() {
		return rmaePercentage;
	}

	public void setRmaePercentage(double rmaePercentage) {
		this.rmaePercentage = "" + rmaePercentage;
	}
}