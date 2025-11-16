import { Client, Databases, ID, Query } from "appwrite";
const PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID;
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_ID;

const client = new Client()
  .setEndpoint(import.meta.env.REACT_APP_APPWRITE_ENDPOINT || "http://localhost/v1")
  .setProject(import.meta.env.REACT_APP_APPWRITE_PROJECT_ID || "your-project-id");


const database = new Databases(client);

export const updateSearchCount = async (searchTerm, movie) => {
  //use appwrite SDK if a doc already exists in db
  try {
    const result = await database.listDocuments(DATABASE_ID, COLLECTION_ID, [
      Query.equal("searchTerm", searchTerm),
    ]);
    if (result.documents.length > 0) {
      const doc = result.documents[0];
      await database.updateDocument(DATABASE_ID, COLLECTION_ID, doc.$id, {
        //update the count
        count: doc.count + 1,
      });
    } else {
      //else create new doc with search term and count as 1
      await database.createDocument(DATABASE_ID, COLLECTION_ID, ID.unique(), {
        searchTerm,
        count: 1,
        movie_id: movie.id,
        poster_url: `https://image.tmdb.org/t/p/w500${movie.poster_path}`,
      });
    }
  } catch (err) {
    console.log(err);
  }
};

export async function getTrendingMovies(databaseId, collectionId, limit = 20) {
  if (!databaseId) throw new Error('Missing required parameter: "databaseId"');
  if (!collectionId) throw new Error('Missing required parameter: "collectionId"');

  // Example using Appwrite Databases.listDocuments
  const response = await databases.listDocuments(databaseId, collectionId, [
    // add queries if needed, e.g., limit or order
  ]);

  // return top `limit` documents (adjust to your structure)
  return (response.documents || []).slice(0, limit);
}
