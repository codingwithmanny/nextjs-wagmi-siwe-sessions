// Imports
// ========================================================
import type { NextPage } from 'next';
import * as React from 'react';
import { useAccount, useNetwork, useSignMessage, useConnect, useEnsAvatar, useEnsName, useDisconnect, Connector } from 'wagmi';
import { SiweMessage } from 'siwe';

// Components
// ========================================================
const SignInButton = ({
  onSuccess,
  onError,
}: {
  onSuccess: (args: { address: string }) => void
  onError: (args: { error: Error }) => void
}) => {
  const [state, setState] = React.useState<{
    loading?: boolean
    nonce?: string
  }>({})

  const fetchNonce = async () => {
    try {
      const nonceRes = await fetch('/api/nonce');
      const nonce = await nonceRes.text();
      setState((x) => ({ ...x, nonce }));
    } catch (error) {
      setState((x) => ({ ...x, error: error as Error }));
    }
  };

  // Pre-fetch random nonce when button is rendered
  // to ensure deep linking works for WalletConnect
  // users on iOS when signing the SIWE message
  React.useEffect(() => {
    fetchNonce();
  }, []);

  const { address } = useAccount();
  const { chain: activeChain } = useNetwork();
  const { signMessageAsync } = useSignMessage();

  const signIn = async () => {
    try {
      const chainId = activeChain?.id
      if (!address || !chainId) return

      setState((x) => ({ ...x, loading: true }))
      // Create SIWE message with pre-fetched nonce and sign with wallet
      const message = new SiweMessage({
        domain: window.location.host,
        address,
        statement: 'Sign in with Ethereum to the app.',
        uri: window.location.origin,
        version: '1',
        chainId,
        nonce: state.nonce,
      })
      const signature = await signMessageAsync({
        message: message.prepareMessage(),
      })

      // Verify signature
      const verifyRes = await fetch('/api/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, signature }),
      })
      if (!verifyRes.ok) throw new Error('Error verifying message')

      setState((x) => ({ ...x, loading: false }))
      onSuccess({ address })
    } catch (error) {
      setState((x) => ({ ...x, loading: false, nonce: undefined }))
      onError({ error: error as Error })
      fetchNonce()
    }
  }

  return (
    <button disabled={!state.nonce || state.loading} onClick={signIn}>
      Sign-In with Ethereum
    </button>
  )
};

// Main Page Component
// ========================================================
const Home: NextPage = () => {
  // State Props
  const { address, connector, isConnected } = useAccount();
  const { data: ensAvatar } = useEnsAvatar({ addressOrName: address });
  const { data: ensName } = useEnsName({ address });
  const { disconnect } = useDisconnect();
  const { connect, connectors, error, isLoading, pendingConnector } =
    useConnect();
  const [isConnectionMade, setIsConnectionMade] = React.useState(false);
  const [mainConnecters, setMainConnectors] = React.useState<Connector<any, any, any>[] | null>(null);
  const [state, setState] = React.useState<{
    address?: string
    error?: Error
    loading?: boolean
  }>({});

  // Hooks
  // Fetch user when:
  React.useEffect(() => {
    setIsConnectionMade(isConnected);

    if (typeof window === undefined) return;
    const handler = async () => {
      try {
        const res = await fetch('/api/me')
        const json = await res.json()
        setState((x) => ({ ...x, address: json.address }))
      } catch (_error) { }
    }
    // 1. page loads
    handler()

    // 2. window is focused (in case user logs out of another window)
    window.addEventListener('focus', handler)
    return () => window.removeEventListener('focus', handler)
  }, [isConnected]);

  React.useEffect(() => {
    if (!connectors) return;
    setMainConnectors(connectors);
  }, [connectors]);

  // Renders
  if (isConnectionMade) {
    return (
      <div>
        <div className="group">
          {ensAvatar ? <img src={ensAvatar} alt="ENS Avatar" /> : null}
          <pre><code>{ensName ? `${ensName} (${address})` : address}</code></pre>
          <pre><code>Connected to {connector?.name}</code></pre>
          <button onClick={() => disconnect()}>Disconnect</button>
        </div>

        <hr />

        {state.address ? (
          <div className="group">
            <pre><code>Signed in as {state.address}</code></pre>
            <button
              onClick={async () => {
                await fetch('/api/logout')
                setState({})
              }}
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div className="group">
            <SignInButton
              onSuccess={({ address }) => setState((x) => ({ ...x, address }))}
              onError={({ error }) => setState((x) => ({ ...x, error }))}
            />
          </div>
        )}

        <hr />

        <p><strong><small>Debug</small></strong></p>

        <pre><code>{JSON.stringify(state, null, ' ')}</code></pre>
      </div>
    )
  };

  return <div>
    {mainConnecters?.map((connector: any) => (<div className="group" key={connector.id}>
      <button
        disabled={!connector.ready}
        onClick={() => connect({ connector })}
      >
        {connector.name}
        {!connector.ready && ' (unsupported)'}
        {isLoading &&
          connector.id === pendingConnector?.id &&
          ' (connecting)'}
      </button></div>
    ))}

    <div className="group">
      {error && <div>{error.message}</div>}
    </div>
  </div>
};

// Exports
// ========================================================
export default Home;