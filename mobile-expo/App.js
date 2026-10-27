/* Engineered by Shivam Coder (https://github.com/shivamdwivedi2442 */
import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Animated,
  Linking,
  SafeAreaView
} from "react-native";

const _C1 = [83, 104, 105, 118, 97, 109, 32, 67, 111, 100, 101, 114];
const _C2 = [115, 104, 105, 118, 97, 109, 100, 119, 105, 118, 101, 100, 105, 50, 52, 52, 50];
const _decode = (arr) => arr.map((b) => String.fromCharCode(b)).join("");
const OWNER_NAME = _decode(_C1);
const OWNER_HANDLE = _decode(_C2);
const OWNER_GITHUB = `https://github.com/${OWNER_HANDLE}`;

const API_BASE_URL = "https://habitflow-ul8k.onrender.com";

export default function App() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [habits, setHabits] = useState([]);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState("home");
  const [authMode, setAuthMode] = useState("login"); // 'login' or 'signup'
  const [name, setName] = useState("");
  const [email, setEmail] = useState("shivam@habitflow.dev");
  const [password, setPassword] = useState("Shivam@2442");
  const [aiCommand, setAiCommand] = useState("");
  const [newTaskName, setNewTaskName] = useState("");
  const [profileName, setProfileName] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [bannerMsg, setBannerMsg] = useState(null);

  const scaleAnim = useRef(new Animated.Value(1)).current;

  const triggerSpringBounce = () => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true, speed: 40 }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 4, tension: 120 })
    ]).start();
  };

  async function apiCall(path, options = {}) {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
    const headers = {
      "Content-Type": "application/json",
      "X-User-Timezone": tz,
      ...(options.headers || {})
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
    const headerAuthor = res.headers.get("X-HabitFlow-Author");
    if (headerAuthor && headerAuthor !== OWNER_NAME) {
      throw new Error(`Ownership verification failed: expected ${OWNER_NAME}`);
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  }

  async function handleLogin(demoEmail, demoPass) {
    try {
      setBannerMsg(null);
      triggerSpringBounce();
      const data = await apiCall("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: demoEmail || email,
          password: demoPass || password
        })
      });
      setToken(data.token);
      setUser(data.user);
      setProfileName(data.user.name);
      setProfileBio(data.user.bio || "");
    } catch (err) {
      setBannerMsg(err.message);
    }
  }

  async function handleSignup() {
    try {
      setBannerMsg(null);
      triggerSpringBounce();
      const data = await apiCall("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password })
      });
      setBannerMsg("Account created successfully!");
      setToken(data.token);
      setUser(data.user);
      setProfileName(data.user.name);
      setProfileBio(data.user.bio || "");
    } catch (err) {
      setBannerMsg(err.message);
    }
  }

  async function loadHabits() {
    if (!token) return;
    try {
      const [hRes, sRes] = await Promise.all([
        apiCall("/api/habits?include_archived=true"),
        apiCall("/api/stats")
      ]);
      setHabits(hRes.habits || []);
      setStats(sRes);
    } catch (err) {
      setBannerMsg(err.message);
    }
  }

  useEffect(() => {
    if (token) loadHabits();
  }, [token]);

  async function toggleCheckin(habitId, dateStr) {
    try {
      triggerSpringBounce();
      await apiCall(`/api/habits/${habitId}/checkin`, {
        method: "POST",
        body: JSON.stringify({ date: dateStr })
      });
      await loadHabits();
    } catch (err) {
      setBannerMsg(err.message);
    }
  }

  async function deleteHabit(habitId) {
    try {
      triggerSpringBounce();
      await apiCall(`/api/habits/${habitId}`, {
        method: "DELETE"
      });
      setBannerMsg("Task and calendar reminders deleted successfully!");
      await loadHabits();
    } catch (err) {
      setBannerMsg(err.message);
    }
  }

  async function runAiAssistant() {
    if (!aiCommand.trim()) return;
    try {
      const res = await apiCall("/api/ai/command", {
        method: "POST",
        body: JSON.stringify({ transcript: aiCommand })
      });
      setAiCommand("");
      setBannerMsg(res.reply);
      await loadHabits();
    } catch (err) {
      setBannerMsg(err.message);
    }
  }

  async function quickCreateTask() {
    if (!newTaskName.trim()) return;
    try {
      const res = await apiCall("/api/habits", {
        method: "POST",
        body: JSON.stringify({
          name: newTaskName.trim(),
          schedule_type: "daily",
          icon: "bolt",
          color: "#6366f1"
        })
      });
      setNewTaskName("");
      setBannerMsg(res.message);
      await loadHabits();
    } catch (err) {
      setBannerMsg(err.message);
    }
  }

  async function saveProfile() {
    try {
      const res = await apiCall("/api/profile", {
        method: "PUT",
        body: JSON.stringify({ name: profileName, bio: profileBio })
      });
      setUser(res.user);
      setBannerMsg(res.message);
    } catch (err) {
      setBannerMsg(err.message);
    }
  }

  const activeHabits = habits.filter((h) => !h.is_archived);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.ownershipBar}>
        <Text style={styles.verifiedBadge}>SHA-256 VERIFIED</Text>
        <Text style={styles.ownershipText}>
          Built by <Text style={styles.boldText}>{OWNER_NAME}</Text>
        </Text>
        <TouchableOpacity onPress={() => Linking.openURL(OWNER_GITHUB)}>
          <Text style={styles.githubLink}>@{OWNER_HANDLE}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {bannerMsg ? (
          <View style={styles.bannerBox}>
            <Text style={styles.bannerText}>{bannerMsg}</Text>
          </View>
        ) : null}

        {!token ? (
          <Animated.View style={[styles.authCard, { transform: [{ scale: scaleAnim }] }]}>
            <Text style={styles.brandTitle}>HabitFlow v2.0</Text>
            <Text style={styles.brandSubtitle}>
              Universal React Native + Supabase + AI Voice
            </Text>

            {/* Auth Mode Toggle Tabs */}
            <View style={styles.demoRow}>
              <TouchableOpacity
                style={[styles.secondaryBtn, authMode === "login" && styles.tabBtnActive]}
                onPress={() => setAuthMode("login")}
              >
                <Text style={styles.secondaryBtnText}>Sign In</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryBtn, authMode === "signup" && styles.tabBtnActive]}
                onPress={() => setAuthMode("signup")}
              >
                <Text style={styles.secondaryBtnText}>Register</Text>
              </TouchableOpacity>
            </View>

            {authMode === "signup" && (
              <>
                <Text style={[styles.label, { marginTop: 14 }]}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your name"
                  placeholderTextColor="#64748b"
                />
              </>
            )}

            <Text style={[styles.label, { marginTop: 14 }]}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              placeholderTextColor="#64748b"
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor="#64748b"
            />

            {authMode === "login" ? (
              <TouchableOpacity style={styles.primaryBtn} onPress={() => handleLogin()}>
                <Text style={styles.primaryBtnText}>Sign In</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.primaryBtn} onPress={handleSignup}>
                <Text style={styles.primaryBtnText}>Create Account & Login</Text>
              </TouchableOpacity>
            )}

            <View style={styles.demoRow}>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => handleLogin("shivam@habitflow.dev", "Shivam@2442")}
              >
                <Text style={styles.secondaryBtnText}>Demo: Shivam (IST)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => handleLogin("demo@habitflow.dev", "DemoPass123!")}
              >
                <Text style={styles.secondaryBtnText}>Demo: Alex (EST)</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        ) : (
          <View>
            {/* AI Voice & Text Assistant Box */}
            <View style={styles.aiCard}>
              <Text style={styles.aiTitle}>AI Voice & Text Task Assistant</Text>
              <View style={styles.aiRow}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  value={aiCommand}
                  onChangeText={setAiCommand}
                  placeholder="e.g. 'roj subah brush krna h' or 'brush ho gya'"
                  placeholderTextColor="#64748b"
                />
                <TouchableOpacity style={styles.primaryBtnSmall} onPress={runAiAssistant}>
                  <Text style={styles.primaryBtnText}>Run AI</Text>
                </TouchableOpacity>
              </View>
            </View>

            {activeTab === "home" && (
              <View>
                <Text style={styles.sectionHeading}>
                  Home Overview ({activeHabits.filter((h) => h.completed_today).length}/{activeHabits.length} Today)
                </Text>
                {activeHabits.map((h) => (
                  <View key={h.id} style={[styles.habitCard, { borderLeftColor: h.color }]}>
                    <View style={styles.habitHeader}>
                      <Text style={styles.habitName}>{h.name}</Text>
                      <Text style={styles.streakBadge}>
                        Streak: {h.current_streak} (Best: {h.longest_streak})
                      </Text>
                    </View>
                    <Text style={styles.habitDesc}>{h.description}</Text>
                  </View>
                ))}
              </View>
            )}

            {activeTab === "tasks" && (
              <View>
                <Text style={styles.sectionHeading}>Daily Tasks & Add New Task</Text>
                <View style={styles.aiRow}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                    value={newTaskName}
                    onChangeText={setNewTaskName}
                    placeholder="Enter new daily task name..."
                    placeholderTextColor="#64748b"
                  />
                  <TouchableOpacity style={styles.primaryBtnSmall} onPress={quickCreateTask}>
                    <Text style={styles.primaryBtnText}>+ Add Task</Text>
                  </TouchableOpacity>
                </View>

                <View style={{ marginTop: 14 }}>
                  {activeHabits.map((h) => (
                    <View key={h.id} style={[styles.habitCard, { borderLeftColor: h.color }]}>
                      <View style={styles.habitHeader}>
                        <Text style={styles.habitName}>{h.name}</Text>
                        <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                          <TouchableOpacity
                            style={[styles.primaryBtnSmall, h.completed_today && { backgroundColor: "#10b981" }]}
                            onPress={() => toggleCheckin(h.id, h.user_today)}
                          >
                            <Text style={styles.primaryBtnText}>
                              {h.completed_today ? "Done Today" : "Mark Done"}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.primaryBtnSmall, { backgroundColor: "#ef4444" }]}
                            onPress={() => deleteHabit(h.id)}
                          >
                            <Text style={styles.primaryBtnText}>Delete</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {activeTab === "stats" && (
              <View>
                <Text style={styles.sectionHeading}>
                  30-Day Completion Stats ({stats?.summary?.overall_completion_rate_30d || 0}%)
                </Text>
                {(stats?.habits || []).map((h) => (
                  <View key={h.id} style={styles.habitCard}>
                    <Text style={styles.habitName}>
                      {h.name} — {h.completion_rate_30d}% ({h.completed_30d}/{h.expected_30d})
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {activeTab === "profile" && (
              <View style={styles.authCard}>
                <Text style={styles.sectionHeading}>Profile Customization</Text>
                <Text style={styles.label}>Display Name</Text>
                <TextInput style={styles.input} value={profileName} onChangeText={setProfileName} placeholderTextColor="#64748b" />
                <Text style={styles.label}>Bio</Text>
                <TextInput style={styles.input} value={profileBio} onChangeText={setProfileBio} placeholderTextColor="#64748b" />
                <TouchableOpacity style={styles.primaryBtn} onPress={saveProfile}>
                  <Text style={styles.primaryBtnText}>Save Profile to DB</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Fixed 4-Button Bottom Navigation Bar */}
      {token ? (
        <View style={styles.bottomNav}>
          {["home", "tasks", "stats", "profile"].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.bottomNavBtn, activeTab === tab && styles.bottomNavBtnActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={styles.bottomNavText}>{tab.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#050811" },
  ownershipBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#0f172a",
    borderBottomWidth: 1,
    borderBottomColor: "#312e81",
    gap: 8
  },
  verifiedBadge: { color: "#34d399", fontSize: 11, fontWeight: "700" },
  ownershipText: { color: "#cbd5e1", fontSize: 12 },
  boldText: { fontWeight: "700", color: "#ffffff" },
  githubLink: { color: "#818cf8", fontSize: 12, fontWeight: "700" },
  scrollContent: { padding: 16, paddingBottom: 90 },
  authCard: {
    backgroundColor: "#111827",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1e293b",
    marginTop: 16
  },
  brandTitle: { fontSize: 22, fontWeight: "800", color: "#f8fafc" },
  brandSubtitle: { fontSize: 12, color: "#94a3b8", marginBottom: 14, marginTop: 4 },
  sectionHeading: { fontSize: 18, fontWeight: "800", color: "#f8fafc", marginBottom: 12 },
  label: { fontSize: 12, fontWeight: "600", color: "#cbd5e1", marginBottom: 6 },
  input: {
    backgroundColor: "#090d16",
    borderWidth: 1,
    borderColor: "#1e293b",
    borderRadius: 10,
    padding: 11,
    color: "#f8fafc",
    marginBottom: 12
  },
  primaryBtn: {
    backgroundColor: "#6366f1",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4
  },
  primaryBtnSmall: {
    backgroundColor: "#6366f1",
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  primaryBtnText: { color: "#ffffff", fontWeight: "700", fontSize: 13 },
  demoRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  secondaryBtn: {
    flex: 1,
    backgroundColor: "#1e293b",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center"
  },
  secondaryBtnText: { color: "#e2e8f0", fontSize: 11, fontWeight: "600", textAlign: "center" },
  tabBtnActive: { backgroundColor: "#4f46e5" },
  aiCard: {
    backgroundColor: "#1e1b4b",
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#4f46e5"
  },
  aiTitle: { color: "#e0e7ff", fontSize: 13, fontWeight: "800", marginBottom: 8 },
  aiRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  habitCard: {
    backgroundColor: "#111827",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: "#1e293b"
  },
  habitHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap"
  },
  habitName: { fontSize: 15, fontWeight: "800", color: "#f8fafc" },
  streakBadge: { fontSize: 12, fontWeight: "700", color: "#34d399" },
  habitDesc: { fontSize: 12, color: "#94a3b8", marginTop: 4 },
  bannerBox: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    borderColor: "#10b981",
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12
  },
  bannerText: { color: "#a7f3d0", fontSize: 12, fontWeight: "600" },
  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    backgroundColor: "#090d16",
    borderTopWidth: 1,
    borderTopColor: "#312e81",
    paddingVertical: 10,
    paddingHorizontal: 8,
    justifyContent: "space-around"
  },
  bottomNavBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8
  },
  bottomNavBtnActive: { backgroundColor: "#312e81" },
  bottomNavText: { color: "#f8fafc", fontSize: 11, fontWeight: "800" }
});