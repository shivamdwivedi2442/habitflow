/* Engineered by Shivam Coder (https://github.com/shivamdwivedi2442 */
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "SHOW_HABIT_REMINDER") {
    self.registration.showNotification(data.title || "⚡ HabitFlow Reminder", {
      body: data.body || "Time to complete your scheduled habit!",
      icon: "/manifest.json",
      badge: "/manifest.json",
      vibrate: [200, 100, 200],
      tag: data.tag || "habitflow-reminder"
    });
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return self.clients.openWindow("/");
    })
  );
});
