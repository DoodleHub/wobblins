import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { Button } from "@/components/Button";
import { ComingSoonScreen } from "@/components/ComingSoonScreen";
import { signOut } from "@/supabase/auth";

export default function ProfileScreen() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const onSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      router.replace("/login");
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <ComingSoonScreen
        icon="👤"
        title="Profile"
        description="Player level, collection count, and achievements. Coming soon."
      />
      <View className="px-8 pb-6">
        <Button label="Sign Out" variant="secondary" onPress={onSignOut} loading={signingOut} />
      </View>
    </View>
  );
}
