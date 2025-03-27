use mongodb::{bson::doc, options::ClientOptions, Client, Database};
use std::env;
use dotenv::dotenv;


pub async fn connect_to_db() -> mongodb::error::Result<Database> {
    dotenv().ok(); // Загружаем переменные окружения из .env

    let mongo_uri = env::var("MONGO_URI")
        .expect("⚠️ MONGO_URI must be set in .env");

    let client_options = ClientOptions::parse(mongo_uri).await?;
    let client = Client::with_options(client_options)?;

    let db = client.database("mydatabase"); // Получаем объект базы данных

    println!("Connected to MongoDB!");
    Ok(db)
}
