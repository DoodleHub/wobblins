import { Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS } from "@/constants/theme";

import { Button } from "./Button";
import { Icon, type IconSpec } from "./Icon";

type SlideUpModalProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  icon?: IconSpec;
};

/** Bottom sheet-style modal for surfacing a short blocking message (e.g. an action the player can't afford). */
export function SlideUpModal({ visible, onClose, title, message, icon }: SlideUpModalProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/60" onPress={onClose}>
        <Pressable
          className="gap-4 rounded-t-3xl border-x border-t border-border bg-surface px-6 pt-6"
          style={{ paddingBottom: insets.bottom + 24 }}
          onPress={(e) => e.stopPropagation()}
        >
          {icon && (
            <View
              className="h-12 w-12 items-center justify-center self-center rounded-full"
              style={{ backgroundColor: `${COLORS.danger}1a` }}
            >
              <Icon {...icon} size={22} color={COLORS.danger} />
            </View>
          )}
          <Text className="text-center font-display-bold text-lg text-text">{title}</Text>
          {message && <Text className="text-center font-sans text-sm text-text-subtle">{message}</Text>}
          <Button label="OK" onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
