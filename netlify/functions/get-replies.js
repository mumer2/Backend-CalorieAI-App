const { MongoClient, ObjectId } = require('mongodb');
const fetch = require('node-fetch');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Only GET allowed' };
  }

  const { userId, coachId } = event.queryStringParameters;
  if (!userId || !coachId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Missing userId or coachId' }),
    };
  }

  const client = new MongoClient(process.env.MONGO_DB_URI);
  try {
    await client.connect();
    const db = client.db('calorieai');
    const requestCollection = db.collection('coach_requests');
    const userCollection = db.collection('users');

    // Get all replied messages
    const newReplies = await requestCollection
      .find({ userId, coachId, reply: { $exists: true } })
      .sort({ repliedAt: -1 })
      .toArray();

    // Get stored replies count for comparison (could also use timestamps instead)
    const storedCountCollection = db.collection('reply_tracking');
    const storedEntry = await storedCountCollection.findOne({ userId, coachId });
    const previousCount = storedEntry?.count || 0;

    // 🚨 Only send notification if new replies are added
    if (newReplies.length > previousCount) {
      // Update stored count
      await storedCountCollection.updateOne(
        { userId, coachId },
        { $set: { count: newReplies.length } },
        { upsert: true }
      );

      // Fetch push token from users collection
      const user = await userCollection.findOne({ _id: new ObjectId(userId) });
      const pushToken = user?.pushToken;

      if (pushToken) {
        // Send push notification using Expo
        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: pushToken,
            sound: 'default',
            title: '📩 New Reply from Your Coach!',
            body: 'Tap to view the response now.',
            data: { screen: 'Replies' },
            badge: 1,
          }),
        });
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify(newReplies),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Server error', error: err.message }),
    };
  } finally {
    await client.close();
  }
};
