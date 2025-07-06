const { MongoClient, ObjectId } = require('mongodb');
const { Expo } = require('expo-server-sdk');

const expo = new Expo();

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
    const usersCollection = db.collection('users');

    // Get original request
    const requestDoc = await requestsCollection.findOne({ _id: new ObjectId(requestId) });
    if (!requestDoc) {
      await client.close();
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Request not found' }),
      };
    }

    // Update the reply
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

    // Save notification in DB
    await notificationsCollection.insertOne({
      userId: requestDoc.userId,
      title: '📩 New Reply from Your Coach!',
      body: `Coach replied: "${reply}"`,
      isRead: false,
      createdAt: new Date(),
      data: { screen: 'Notifications', requestId },
    });

    // Send push notification
    const user = await usersCollection.findOne({ _id: new ObjectId(requestDoc.userId) });
    const token = user?.expoPushToken;

    if (token && Expo.isExpoPushToken(token)) {
      await expo.sendPushNotificationsAsync([
        {
          to: token,
          sound: 'default',
          title: '📩 New Reply from Your Coach!',
          body: `Coach replied: "${reply}"`,
          data: { screen: 'Notifications', requestId },
        },
      ]);
    }

    await client.close();

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, updated: result.modifiedCount }),
    };
  } catch (err) {
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