// import "react-native-url-polyfill/auto";

// import AsyncStorage from "@react-native-async-storage/async-storage";
// import { createClient } from "@supabase/supabase-js";
// import { AppState } from "react-native";

// const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
// const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_KEY;


// export const supabase = createClient(supabaseUrl!, supabaseKey!, {
// 	auth: {
// 		storage: AsyncStorage,
// 		autoRefreshToken: true,
// 		persistSession: true,
// 		detectSessionInUrl: false,
// 	},
// });

// AppState.addEventListener("change", (state) => {
// 	if (state === "active") {
// 		supabase.auth.startAutoRefresh();
// 	} else {
// 		supabase.auth.stopAutoRefresh();
// 	}
// });

import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, AppStateStatus } from "react-native";

// const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
// const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
	throw new Error('Supabase URL dan Key harus diatur di environment variables');
}

// // 1. Buat storage adapter yang adaptif
// const createSafeStorage = () => {
// 	if (Platform.OS === 'web') {
// 		return {
// 			getItem: async (key: string) => {
// 				if (typeof window !== 'undefined') {
// 					return localStorage.getItem(key);
// 				}
// 				return null;
// 			},
// 			setItem: async (key: string, value: string) => {
// 				if (typeof window !== 'undefined') {
// 					localStorage.setItem(key, value);
// 				}
// 			},
// 			removeItem: async (key: string) => {
// 				if (typeof window !== 'undefined') {
// 					localStorage.removeItem(key);
// 				}
// 			},
// 		};
// 	} else {
// 		// Gunakan SecureStore (lebih aman) atau AsyncStorage
// 		return {
// 			getItem: (key: string) => SecureStore.getItemAsync(key),
// 			setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
// 			removeItem: (key: string) => SecureStore.deleteItemAsync(key),
// 		};
// 	}
// };

// 2. Buat Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey, {
	auth: {
	  storage: AsyncStorage,
	  autoRefreshToken: true,
	  persistSession: true,
	  detectSessionInUrl: false,
	},
  })
// 3. Handle AutoRefresh khusus mobile
// if (Platform.OS !== 'android') {
// 	AppState.addEventListener("change", (state: AppStateStatus) => {
// 		if (state === "active") {
// 			supabase.auth.startAutoRefresh();
// 		} else {
// 			supabase.auth.stopAutoRefresh();
// 		}
// 	});
// }