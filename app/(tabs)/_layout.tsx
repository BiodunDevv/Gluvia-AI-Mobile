import { AnimatedTabBar } from "@/components/tab";
import { Tabs } from "expo-router";
import React from "react";

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <AnimatedTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        animation: "shift",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Meals",
        }}
      />
      <Tabs.Screen
        name="ai-chat"
        options={{
          title: "AI Chat",
        }}
      />
      <Tabs.Screen
        name="foods"
        options={{
          title: "Foods",
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
        }}
      />
    </Tabs>
  );
}
