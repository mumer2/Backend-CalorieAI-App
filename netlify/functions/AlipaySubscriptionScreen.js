import React, { useState } from 'react';
import { View, Text, Button, TouchableOpacity, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

const PLANS = [
  { label: 'Monthly', price: 9.99, id: 'monthly' },
  { label: 'Yearly', price: 99.99, id: 'yearly' },
];

export default function AlipaySubscriptionScreen() {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentUrl, setPaymentUrl] = useState('');
  const [showWebView, setShowWebView] = useState(false);

  const handlePay = async () => {
    // Call your backend to create an Alipay order and get the payment URL
    // Example: POST /api/create-alipay-order { plan: selectedPlan.id }
    // Backend should return { paymentUrl: "https://..." }
    try {
      const response = await fetch('https://your-backend.com/api/create-alipay-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlan.id }),
      });
      const data = await response.json();
      setPaymentUrl(data.paymentUrl);
      setShowWebView(true);
    } catch (e) {
      alert('Failed to start payment');
    }
  };

  if (showWebView && paymentUrl) {
    return (
      <WebView
        source={{ uri: paymentUrl }}
        onNavigationStateChange={navState => {
          // Optionally handle payment result by checking navState.url
        }}
      />
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose a Subscription Plan</Text>
      {PLANS.map(plan => (
        <TouchableOpacity
          key={plan.id}
          style={[
            styles.planButton,
            selectedPlan?.id === plan.id && styles.selectedPlan,
          ]}
          onPress={() => setSelectedPlan(plan)}
        >
          <Text style={styles.planText}>{plan.label} - ${plan.price}</Text>
        </TouchableOpacity>
      ))}
      <Button
        title="Pay with Alipay"
        onPress={handlePay}
        disabled={!selectedPlan}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, marginBottom: 20 },
  planButton: {
    padding: 15,
    margin: 10,
    borderWidth: 1,
    borderColor: '#aaa',
    borderRadius: 8,
    width: 200,
    alignItems: 'center',
  },
  selectedPlan: { backgroundColor: '#e0f7fa' },
  planText: { fontSize: 18 },
});