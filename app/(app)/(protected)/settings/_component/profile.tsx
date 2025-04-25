import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Colors } from "../styles";
import { capitalizeText } from "@/utils/format";

type UserData = {
  name: string;
  email: string;
  initials: string;
};

type ProfileSectionProps = {
  userData: UserData;
  colors: Colors;
  styles: any;
};

const ProfileSection = ({ userData, colors, styles }: ProfileSectionProps) => {
  return (
    <View style={styles.profileContainer}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{userData.initials}</Text>
      </View>
      <View style={styles.profileInfo}>
        <Text style={styles.profileName}>{capitalizeText(userData.name)}</Text>
        <Text style={styles.profileEmail}>{userData.email}</Text>
        <TouchableOpacity style={styles.profileButton}>
          <Text style={styles.profileButtonText}>Edit Profil</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ProfileSection;