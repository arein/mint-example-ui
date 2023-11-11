import * as React from 'react'
import { useAccount, usePrepareContractWrite, useContractWrite, useWaitForTransaction, erc721ABI, useWalletClient, usePublicClient } from 'wagmi'
import styles from "@/styles/Home.module.css"
import constants from '../utils/constants'
import { useState } from "react";
import { createClient, encodeFunctionData, http } from 'viem'
import { polygon } from 'viem/chains'
import { UserOperation, bundlerActions, getAccountNonce, signUserOperationHashWithECDSA } from 'permissionless'
import { pimlicoPaymasterActions, pimlicoBundlerActions } from 'permissionless/actions/pimlico'

const contractAddress = constants.contractAddreses['polygon'] as `0x${string}`;
const apiKey = process.env.NEXT_PUBLIC_PIMLICO_API_KEY || "";
const ENTRY_POINT_ADDRESS = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789"

export function MintSmart() {
	const [isPimlicoError, setIsPimlicoError] = useState(false);
	const [pimlicoError, setPimlicoError] = useState(new Error(''));
	const [pimlicoReceipt, setPimlicoReceipt] = useState(null);
	const [pimlicoHash, setPimlicoHash] = useState('');

    const { address, isConnecting, isDisconnected } = useAccount();

    const bundlerClient = createClient({
        transport: http(`https://api.pimlico.io/v1/polygon/rpc?apikey=${apiKey}`),
        chain: polygon
    })
        .extend(bundlerActions)
        .extend(pimlicoBundlerActions)
     

    // Not used in this example
    // const paymasterClient = createClient({
    //     // ⚠️ using v2 of the API ⚠️
    //     transport: http(`https://api.pimlico.io/v2/polygon/rpc?apikey=${apiKey}`),
    //     chain: polygon
    // }).extend(pimlicoPaymasterActions)

    // You can get the paymaster addresses from https://docs.pimlico.io/reference/erc20-paymaster/contracts
    const erc20PaymasterAddress = "0xa683b47e447De6c8A007d9e294e87B6Db333Eb18"

    const { data: walletClient, isError: isWalletClientError, error: walletClientError, isLoading } = useWalletClient()
     
    const publicClient = usePublicClient()

    const submitUserOperation = async (userOperation: UserOperation) => {
        setPimlicoHash('')
        const userOperationHash = await bundlerClient.sendUserOperation({
            userOperation,
            entryPoint: ENTRY_POINT_ADDRESS
        })
        console.log(`UserOperation submitted. Hash: ${userOperationHash}`)
        setPimlicoHash(userOperationHash)
     
        console.log("Querying for receipts...")
        const receipt = await bundlerClient.waitForUserOperationReceipt({
            hash: userOperationHash
        })
        console.log(`Receipt found!\nTransaction hash: ${receipt.receipt.transactionHash}`)
        return receipt
    }

    const submitDummy = async () => {
        console.log("Sponsoring a user operation with the ERC-20 paymaster...")
        const gasPriceResult = await bundlerClient.getUserOperationGasPrice();
        
        const newNonce = await getAccountNonce(publicClient, {
            entryPoint: ENTRY_POINT_ADDRESS as `0x${string}`,
            sender: address as `0x${string}`
        })
        
        const sponsoredUserOperation: UserOperation = {
            sender: address as `0x${string}`,
            nonce: newNonce,
            initCode: "0x",
            callData: genereteDummyCallData(),
            callGasLimit: BigInt(100_000), // hardcode it for now at a high value
            verificationGasLimit: BigInt(500_000), // hardcode it for now at a high value
            preVerificationGas: BigInt(50_000), // hardcode it for now at a high value
            maxFeePerGas: gasPriceResult.fast.maxFeePerGas,
            maxPriorityFeePerGas: gasPriceResult.fast.maxPriorityFeePerGas,
            paymasterAndData: erc20PaymasterAddress, // to use the erc20 paymaster, put its address in the paymasterAndData field
            signature: "0x" // See ext step
        }
        
        sponsoredUserOperation.signature = await signUserOperationHashWithECDSA({
            client: walletClient!,
            userOperation: sponsoredUserOperation,
            chainId: polygon.id,
            entryPoint: ENTRY_POINT_ADDRESS
        })
         
        try {
            await submitUserOperation(sponsoredUserOperation)
        } catch (error: any) {
            setPimlicoError(new Error(error.message))
            setIsPimlicoError(true)
            console.log(error)
        }
    };
   
    return (
      <div>
        <button className={styles.button}  disabled={isLoading} onClick={() => submitDummy?.()}>
            {isLoading ? 'Minting...' : `Mint for Free`}
        </button>
        {pimlicoHash && (
            <div>
            Successfully minted your NFT!
            <div>
                <a href={`https://polygonscan.com/tx/${pimlicoHash}`}>Polygonscan</a>
            </div>
            </div>
        )}
        {(isWalletClientError || isPimlicoError) && (
          <div>Error: {(walletClientError || pimlicoError)?.message}</div>
        )}
      </div>
    )
  }


// SPONSOR A USER OPERATION WITH THE ERC-20 PAYMASTER
const genereteDummyCallData = () => {
    // SEND EMPTY CALL TO VITALIK
    const to = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" // vitalik
    const value = BigInt(0)
    const data = "0x"

    const callData = encodeFunctionData({
        abi: [
            {
                inputs: [
                    { name: "dest", type: "address" },
                    { name: "value", type: "uint256" },
                    { name: "func", type: "bytes" }
                ],
                name: "execute",
                outputs: [],
                stateMutability: "nonpayable",
                type: "function"
            }
        ],
        args: [to, value, data]
    })

    return callData
}
