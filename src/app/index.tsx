import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { Button } from "@/components/Button";
import {
  ELEMENT_CLASSNAMES,
  type Element,
  RARITY_CLASSNAMES,
  type Rarity,
} from "@/constants/theme";
import { signOut } from "@/supabase/auth";
import { useSupabase } from "@/supabase/SupabaseProvider";

const ELEMENTS: Element[] = ["fire", "ice", "water", "nature", "shadow"];
const RARITIES: Rarity[] = ["common", "uncommon", "rare", "epic", "legendary"];

export default function Index() {
  const router = useRouter();
  const { session } = useSupabase();
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
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="w-full min-w-0 gap-8 px-6 py-16"
    >
      <View className="gap-1">
        <Text className="font-display-bold text-3xl text-text">
          Monster Realms
        </Text>
        <Text className="font-sans text-base text-text-muted">
          Design system preview — colors &amp; fonts
        </Text>
      </View>

      {session && (
        <Section title="Session (testing)">
          <View className="gap-2">
            <Text className="font-sans text-sm text-text-muted">
              {session.user.email}
            </Text>
            <Button
              label="Sign Out"
              variant="secondary"
              onPress={onSignOut}
              loading={signingOut}
            />
          </View>
        </Section>
      )}

      <View className="gap-3 rounded-2xl border border-border bg-surface p-4">
        <Text className="font-display text-lg text-primary-dark">
          Featured Monster
        </Text>
        <Text className="font-sans-bold text-xl text-text">Frostfang</Text>
        <View className="flex-row flex-wrap gap-4">
          <Stat label="Gold" value="1,240" className="text-gold" />
          <Stat label="Energy" value="38/50" className="text-energy" />
          <Stat label="HP" value="88/100" className="text-hp" />
          <Stat label="XP" value="640" className="text-xp" />
        </View>
      </View>

      <Section title="Elements">
        <View className="w-full min-w-0 flex-row flex-wrap gap-2">
          {ELEMENTS.map((element) => (
            <View
              key={element}
              className={`rounded-full border bg-surface px-3 py-1.5 ${ELEMENT_CLASSNAMES[element].border}`}
            >
              <Text
                className={`font-sans-semibold text-sm capitalize ${ELEMENT_CLASSNAMES[element].text}`}
              >
                {element}
              </Text>
            </View>
          ))}
        </View>
      </Section>

      <Section title="Rarity">
        <View className="w-full min-w-0 flex-row flex-wrap gap-2">
          {RARITIES.map((rarity) => (
            <View
              key={rarity}
              className={`rounded-full border bg-surface px-3 py-1.5 ${RARITY_CLASSNAMES[rarity].border}`}
            >
              <Text
                className={`font-sans-semibold text-sm capitalize ${RARITY_CLASSNAMES[rarity].text}`}
              >
                {rarity}
              </Text>
            </View>
          ))}
        </View>
      </Section>

      <Section title="Feedback">
        <View className="flex-row gap-4">
          <Text className="font-sans-medium text-success">Success</Text>
          <Text className="font-sans-medium text-warning">Warning</Text>
          <Text className="font-sans-medium text-danger">Danger</Text>
        </View>
      </Section>

      <Section title="Preview">
        <View className="gap-2">
          <Link
            href="/login"
            className="font-sans-medium text-secondary-dark underline"
          >
            Login screen
          </Link>
          <Link
            href="/signup"
            className="font-sans-medium text-secondary-dark underline"
          >
            Signup screen
          </Link>
          <Link
            href="/supabase-test"
            className="font-sans-medium text-secondary-dark underline"
          >
            Supabase connection test
          </Link>
        </View>
      </Section>
    </ScrollView>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View className="w-full min-w-0 gap-2">
      <Text className="font-display text-sm uppercase tracking-wide text-text-muted">
        {title}
      </Text>
      {children}
    </View>
  );
}

function Stat({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className: string;
}) {
  return (
    <View className="gap-0.5">
      <Text className="font-sans text-xs text-text-subtle">{label}</Text>
      <Text className={`font-sans-bold text-base ${className}`}>{value}</Text>
    </View>
  );
}
