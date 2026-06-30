FROM eclipse-temurin:21-jdk AS build

WORKDIR /workspace/agri-ecommerce-backend
COPY agri-ecommerce-backend/ ./

RUN chmod +x mvnw && ./mvnw -DskipTests package

FROM eclipse-temurin:21-jre

WORKDIR /app
COPY --from=build /workspace/agri-ecommerce-backend/target/agri-ecommerce-backend-0.0.1-SNAPSHOT.jar app.jar

EXPOSE 8080
CMD ["java", "-jar", "app.jar"]
