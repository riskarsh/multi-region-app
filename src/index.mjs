import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const dynamo = DynamoDBDocumentClient.from(client);

const TABLE_NAME = "GlobalPocTable"; // Must match the Infra file

export const handler = async (event) => {
  const method = event.httpMethod;
  const currentRegion = process.env.AWS_REGION;

  console.log(`Request received in region: ${currentRegion} | Method: ${method}`);

  try {
    // POST
    if (method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const id = body.id || "test-id";
      
      const item = {
        PK: id,
        message: body.message || "Hello World",
        createdAt: new Date().toISOString(),
        writtenInRegion: currentRegion
      };

      await dynamo.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: item
      }));

      return {
        statusCode: 200,
        body: JSON.stringify({ 
          status: "Success", 
          action: "WRITE", 
          region: currentRegion, 
          item: item 
        })
      };
    }

    // GET
    if (method === 'GET') {
      // Expecting query param ?id=test-id
      const id = event.queryStringParameters?.id || "test-id";

      const result = await dynamo.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: { PK: id }
      }));

      if (!result.Item) {
        return { statusCode: 404, body: JSON.stringify({ error: "Item not found yet (wait for replication)" }) };
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          status: "Success",
          action: "READ",
          readRegion: currentRegion,
          data: result.Item
        })
      };
    }
    
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
