import { createContext, useContext } from 'react';

export const GoogleAuthContext = createContext(false);

export function useGoogleAuthAvailable() {
  return useContext(GoogleAuthContext);
}
