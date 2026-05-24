/// <reference types="expo/types" />

// NOTE: This file should not be edited and should be in your git ignore file.

// Declare CSS module imports for Tamagui
declare module '*.css' {
  const stylesheet: Record<string, string>;
  export default stylesheet;
}

// Declare tamagui.generated.css side-effect import
declare module '../tamagui.generated.css' {}
declare module './tamagui.generated.css' {}
declare module '*/tamagui.generated.css' {}
