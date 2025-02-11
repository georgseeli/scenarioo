package org.scenarioo.rest.diffViewer;

import org.junit.Test;
import org.scenarioo.model.diffViewer.ScenarioDiffInfo;
import org.scenarioo.rest.integrationtest.AbstractIntegrationTest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.HttpMethod.GET;


public class ScenarioDiffInfoResourceIntegrationTest extends AbstractIntegrationTest {

	@Autowired
	private TestRestTemplate testRestTemplate;

	@Test
	public void testGetScenarioDiffInfo() {
		//act
		ResponseEntity<ScenarioDiffInfo> response =
			testRestTemplate
				.getForEntity("/rest/diffViewer/baseBranchName/testBranch/baseBuildName/testBuild/comparisonName/testComparison/useCaseName/testUseCase/scenarioName/testScenario/scenarioDiffInfo",
					ScenarioDiffInfo.class);

		//assert
		assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
		assertThat(response.getBody()).isNotNull();
		ScenarioDiffInfo result = response.getBody();
		assertThat(result.getName()).isEqualTo("testScenario");
		assertThat(result.getAdded()).isEqualTo(1);
		assertThat(result.getChanged()).isEqualTo(0);
		assertThat(result.getRemoved()).isEqualTo(0);
		assertThat(result.getChangeRate()).isBetween(33.3D, 33.4D);
	}

	@Test
	public void testGetScenarioDiffInfos() {
		//act

		ResponseEntity<Map<String, ScenarioDiffInfo>> response = testRestTemplate.exchange(
			"/rest/diffViewer/baseBranchName/testBranch/baseBuildName/testBuild/comparisonName/testComparison/useCaseName/testUseCase/scenarioDiffInfos", GET,
			noRequestEntity(),
			new ParameterizedTypeReference<Map<String, ScenarioDiffInfo>>() {
			});

		//assert
		assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
		assertThat(response.getBody())
			.hasSize(1)
			.extracting("testScenario") //entry with name "testScenario"
			.extracting("name")
			.containsOnly("testScenario");
	}
}
