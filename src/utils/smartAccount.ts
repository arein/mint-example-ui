import { useState, useEffect} from "react";
import { Connector } from "wagmi";

export function useWalletInsights(connector: Connector | undefined) {
    const [walletName, setWalletName] = useState(null);
    const [batchMethodName, setBatchMethodName] = useState(null);

    const getWalletName = async() => {
        const p = await connector?.getProvider({ chainId: 137});
        const metadata = p.signer?.session.peer.metadata;
        const description = metadata?.description;
        const name = metadata?.name;
        const url = metadata?.url;
        console.log("metadata", metadata);
        
        if (name?.includes("Obvious") && description.includes("Smart")) {
            const a: any = "executeBatchCall";
            setBatchMethodName(a);
        } else if (name?.includes("Blocto")) {
            const a: any = "executeBatch";
            setBatchMethodName(a);
        }

        setWalletName(name);
    };

    if (connector && !walletName) getWalletName();

	return { walletName, batchMethodName };
}
