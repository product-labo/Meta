const chainLogos = {
  ethereum: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg',
  polygon: 'https://cryptologos.cc/logos/polygon-matic-logo.svg',
  lisk: 'https://cryptologos.cc/logos/lisk-lsk-logo.svg',
  solana: 'https://cryptologos.cc/logos/solana-sol-logo.svg',
  binance: 'https://cryptologos.cc/logos/binancecoin-bnb-logo.svg',
  arbitrum: 'https://cryptologos.cc/logos/arbitrum-arb-logo.svg',
};

export function DashboardHeader({ startupName, chain }: { startupName: string; chain: string }) {
  const chainIcon = chainLogos[chain as keyof typeof chainLogos];
  
  return (
    <div className="mb-8 p-6 rounded-xl bg-gradient-to-r from-card to-muted/50 border">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            OnChain Analysis: {startupName}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Generated {new Date().toLocaleString()} • {chain.toUpperCase()}
          </p>
        </div>
        {chainIcon && (
          <img src={chainIcon || "/placeholder.svg"} alt={chain} className="w-16 h-16 object-contain" />
        )}
      </div>
    </div>
  );
}