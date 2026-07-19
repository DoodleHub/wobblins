import { Text, TextInput, View, type TextInputProps } from "react-native";

type TextFieldProps = TextInputProps & {
  label: string;
};

export function TextField({ label, ...inputProps }: TextFieldProps) {
  return (
    <View className="gap-1.5">
      <Text className="font-sans-medium text-sm text-text-muted">{label}</Text>
      <TextInput
        placeholderTextColor="#8a8da3"
        className="rounded-xl border border-border bg-surface px-4 py-3 font-sans text-base text-text"
        {...inputProps}
      />
    </View>
  );
}
