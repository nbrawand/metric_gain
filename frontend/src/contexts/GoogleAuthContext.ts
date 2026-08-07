import { createContext, useContext } from 'react';

export interface GoogleAuthState {
  /** The client id has loaded and sign-in can be offered. */
  available: boolean;
  /** Still fetching. Distinct from unavailable: showing "sign-in is
   *  unavailable" while the config is merely in flight is a lie that costs a
   *  sign-in. */
  loading: boolean;
}

export const GoogleAuthContext = createContext<GoogleAuthState>({
  available: false,
  loading: true,
});

export function useGoogleAuth() {
  return useContext(GoogleAuthContext);
}
