package org.scenarioo.rest.builds;

import org.junit.Test;
import org.scenarioo.rest.integrationtest.AbstractIntegrationTest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;

public class BuildsResourceIntegrationTest extends AbstractIntegrationTest {

	@Autowired
	private TestRestTemplate testRestTemplate;

	@Test
	public void should_reject_post_of_new_build_when_unauthorized() throws IOException {
		ResponseEntity<String> response =
			testRestTemplate
				.postForEntity("/rest/builds", null, String.class);

		assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
	}

	@Test
	public void should_allow_post_of_new_build_when_authorized() throws IOException {
		ResponseEntity<String> response =
			testRestTemplate
				.withBasicAuth("scenarioo", "only4test")
				.postForEntity("/rest/builds", null, String.class);

		// Not really a positive test (yet), but it shows that authorization was successful
		assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNSUPPORTED_MEDIA_TYPE);
	}

}
