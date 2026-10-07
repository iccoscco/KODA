FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /app

# Dependencias primero (capa cacheable mientras no cambie pom.xml).
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw dependency:go-offline -B

# Código fuente y build.
COPY src ./src
RUN ./mvnw clean package -DskipTests -B

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
# El volumen de docker-compose monta ./store-backend/uploads aquí en runtime.
# Solo dejamos el directorio creado para cuando se arranca sin volumen.
RUN mkdir -p /app/uploads
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
