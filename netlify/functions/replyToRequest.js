const { MongoClient, ObjectId } = require('mongodb');
const fetch = require('node-fetch');

async function sendPushNotification(expoPushToken, message) {
  const payload = {
    to: expoPushToken,
    sound: "default",
    title: "📩 New Reply from Your Coach!",
    body: message,
    data: { screen: "Notifications" }, // Opens notification screen
  };

  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Only POST allowed' };
  }

  try {
    const { requestId, reply } = JSON.parse(event.body);
    if (!requestId || !reply) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing requestId or reply' }),
      };
    }

    const client = new MongoClient(process.env.MONGO_DB_URI);
    await client.connect();
    const db = client.db('calorieai');

    const requestsCollection = db.collection('coach_requests');
    const notificationsCollection = db.collection('notifications');
    const usersCollection = db.collection('users'); // 👈 user table with push tokens

    // Fetch original request to get userId
    const requestDoc = await requestsCollection.findOne({ _id: new ObjectId(requestId) });
    if (!requestDoc) {
      await client.close();
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Request not found' }),
      };
    }

    // Update request with reply
    const result = await requestsCollection.updateOne(
      { _id: new ObjectId(requestId) },
      {
        $set: {
          reply,
          status: 'read',
          repliedAt: new Date().toISOString(),
        },
      }
    );

    // Save in-app notification
    await notificationsCollection.insertOne({
      userId: requestDoc.userId,
      title: '📩 New Reply from Your Coach!',
      body: `Coach replied to your request: "${reply}"`,
      isRead: false,
      createdAt: new Date(),
      data: { screen: 'Replies', requestId },
    });

    // Fetch user's Expo Push Token
    const user = await usersCollection.findOne({ _id: new ObjectId(requestDoc.userId) });
    if (user?.expoPushToken) {
      await sendPushNotification(user.expoPushToken, `Coach replied: "${reply}"`);
    }

    await client.close();

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, updated: result.modifiedCount }),
    };
  } catch (err) {
    console.error("Error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Server error', error: err.message }),
    };
  }
};


// const { MongoClient, ObjectId } = require('mongodb');

// exports.handler = async (event) => {
//   if (event.httpMethod !== 'POST') {
//     return { statusCode: 405, body: 'Only POST allowed' };
//   }

//   try {
//     const { requestId, reply } = JSON.parse(event.body);
//     if (!requestId || !reply) {
//       return {
//         statusCode: 400,
//         body: JSON.stringify({ message: 'Missing requestId or reply' }),
//       };
//     }

//     const client = new MongoClient(process.env.MONGO_DB_URI);
//     await client.connect();
//     const db = client.db('calorieai');

//     const requestsCollection = db.collection('coach_requests');
//     const notificationsCollection = db.collection('notifications');

//     // Fetch original request to get userId and userName
//     const requestDoc = await requestsCollection.findOne({ _id: new ObjectId(requestId) });
//     if (!requestDoc) {
//       await client.close();
//       return {
//         statusCode: 404,
//         body: JSON.stringify({ message: 'Request not found' }),
//       };
//     }

//     // Update request with reply
//     const result = await requestsCollection.updateOne(
//       { _id: new ObjectId(requestId) },
//       {
//         $set: {
//           reply,
//           status: 'read',
//           repliedAt: new Date().toISOString(),
//         },
//       }
//     );

//     // Add new notification for user
//     await notificationsCollection.insertOne({
//       userId: requestDoc.userId,
//       title: '📩 New Reply from Your Coach!',
//       body: `Coach replied to your request: "${reply}"`,
//       isRead: false,
//       createdAt: new Date(),
//       data: { screen: 'Replies', requestId },
//     });

//     await client.close();

//     return {
//       statusCode: 200,
//       body: JSON.stringify({ success: true, updated: result.modifiedCount }),
//     };
//   } catch (err) {
//     return {
//       statusCode: 500,
//       body: JSON.stringify({ message: 'Server error', error: err.message }),
//     };
//   }
// };