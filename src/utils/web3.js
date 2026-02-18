import { BrowserProvider } from 'ethers';

export const connectWallet = async () => {
  try {
    // Check if MetaMask is installed
    if (!window.ethereum) {
      alert('Please install MetaMask to use this feature!');
      window.open('https://metamask.io/download/', '_blank');
      return null;
    }

    // Request account access
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    });

    // Get provider and signer
    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();

    // Get network info
    const network = await provider.getNetwork();

    console.log('Connected wallet:', address);
    console.log('Network:', network.name, network.chainId);

    return {
      address,
      provider,
      signer,
      chainId: network.chainId,
    };
  } catch (error) {
    console.error('Error connecting wallet:', error);
    
    if (error.code === 4001) {
      alert('Please connect to MetaMask.');
    } else {
      alert('An error occurred while connecting to your wallet.');
    }
    
    return null;
  }
};

export const disconnectWallet = () => {
  // MetaMask doesn't have a disconnect method, but we can clear local state
  console.log('Wallet disconnected');
};

export const getShortAddress = (address) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const switchNetwork = async (chainId) => {
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${chainId.toString(16)}` }],
    });
    return true;
  } catch (error) {
    console.error('Error switching network:', error);
    return false;
  }
};
