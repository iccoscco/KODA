package com.yisus.store_backend;

import java.util.TimeZone;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class StoreBackendApplication {

	public static void main(String[] args) {
		// Forzar UTC a nivel de JVM ANTES de arrancar Spring para que toda fecha
		// generada por LocalDateTime.now(), @CreationTimestamp, @UpdateTimestamp,
		// Hibernate, etc. quede en UTC. El frontend la reconvierte a hora local.
		TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
		System.setProperty("user.timezone", "UTC");

		SpringApplication.run(StoreBackendApplication.class, args);
	}

}
