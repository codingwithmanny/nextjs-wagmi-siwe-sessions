// Imports
// ========================================================
import {
  WagmiConfig,
  createClient,
  configureChains,
  defaultChains,
  chain
} from 'wagmi'
import { publicProvider } from 'wagmi/providers/public';
import type { AppProps } from 'next/app';
import Header from '../components/Header';
import '../styles/globals.css';

// Config
// ========================================================
const { chains, provider, webSocketProvider } = configureChains(
  [chain.mainnet, chain.polygon],
  [publicProvider()],
);

const client = createClient({
  autoConnect: true,
  provider,
  webSocketProvider,
});

// Main App Wrapper
// ========================================================
function MyApp({ Component, pageProps }: AppProps) {
  return <WagmiConfig client={client}><Header /><main><Component {...pageProps} /></main></WagmiConfig>
};

// Exports
// ========================================================
export default MyApp;
