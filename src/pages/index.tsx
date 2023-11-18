import Head from "next/head";
import Image from "next/image";
import styles from "@/styles/Home.module.css";
import { useState } from "react";
import { Mint } from './../components/Mint'
import { useAccount, useWalletClient } from 'wagmi'
import { MintUSDC } from "@/components/MintUSDC";
import Toggle from 'react-toggle'
import { MintSmart } from "@/components/MintSmart";
import { MintSmartUSDC } from "@/components/MintSmartUSDC";
import constants from '../utils/constants'
import { getEthersProvider } from "@/utils/ethers";
import { useWalletInsights } from "@/utils/smartAccount";

const contractAddress = constants.contractAddreses['polygon'] as `0x${string}`;

export default function Home() {
	const [isNetworkSwitchHighlighted, setIsNetworkSwitchHighlighted] =
		useState(false);
	const [isConnectHighlighted, setIsConnectHighlighted] = useState(false);
	const [isSmartAccountMode, setIsSmartAccountMode] = useState(false);
	const [isSmartContractWallet, setIsSmartContractWallet] = useState(false);


	const { address, isConnecting, connector } = useAccount();

	const provider = getEthersProvider({ chainId: 137 });

	if (address) {
		provider.getCode(contractAddress).then((code) => {
			setIsSmartContractWallet(code !== '0x');
		});
	}

	const { walletName, batchMethodName } = useWalletInsights(connector);
	

	const closeAll = () => {
		setIsNetworkSwitchHighlighted(false);
		setIsConnectHighlighted(false);
	};

	return (
		<>
			<Head>
				<title>WalletConnect | Next Starter Template</title>
				<meta
					name="description"
					content="Mint Kit"
				/>
				<meta
					name="viewport"
					content="width=device-width, initial-scale=1"
				/>
				<link rel="icon" href="/favicon.ico" />
			</Head>
			<header>
				<div
					className={styles.backdrop}
					style={{
						opacity:
							isConnectHighlighted || isNetworkSwitchHighlighted
								? 1
								: 0,
					}}
				/>
				<div className={styles.header}>
					<div className={styles.logo}>
						<Image
							src="/logo.svg"
							alt="WalletConnect Logo"
							height="32"
							width="203"
						/>
					</div>
					<div className={styles.buttons}>
						<div
							onClick={closeAll}
							className={`${styles.highlight} ${
								isNetworkSwitchHighlighted
									? styles.highlightSelected
									: ``
							}`}
						>
							<w3m-network-button />
						</div>
						<div
							onClick={closeAll}
							className={`${styles.highlight} ${
								isConnectHighlighted
									? styles.highlightSelected
									: ``
							}`}
						>
							<w3m-button />
						</div>
					</div>
				</div>
			</header>
			<main className={styles.main}>
				<div className={styles.wrapper}>
					<div className={styles.container}>
						<h1>Mint Sample</h1>
						{ !address && <div>Connect Wallet to Continue</div> }
						<div>
							<Toggle id='cheese-status' disabled={!address} defaultChecked={isSmartAccountMode} onChange={(event: any) => setIsSmartAccountMode(event.target.checked)} />
							<label htmlFor='cheese-status'>Smart Account Mode</label>
							{ isSmartContractWallet && <div>Deployed Smart Contract Wallet Detected 👍</div>}
							{ batchMethodName && <div>{batchMethodName} was guessed for batch transactions on {walletName} 👍</div>}
						</div> 
						{ isConnecting && <div>Connecting Wallet...</div> }
						{ address && !isSmartAccountMode && <Mint /> }
						{ address && isSmartAccountMode && <MintSmart /> }
						{ address && !isSmartAccountMode && <MintUSDC /> }
						{ address && isSmartAccountMode && <MintSmartUSDC batchMethodName={batchMethodName || 'executeBatchCall'} /> }
					</div>
					<div className={styles.footer}>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							strokeWidth={1.5}
							stroke="currentColor"
							height={16}
							width={16}
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
							/>
						</svg>
						<a
							href={`https://polygonscan.com/address/${contractAddress}`}
							target="_blank"
						>
							Polygon Contract
						</a>
					</div>
				</div>
			</main>
		</>
	);
}
