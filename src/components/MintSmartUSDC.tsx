import * as React from 'react'
import { useAccount, usePrepareContractWrite, useContractWrite, useWaitForTransaction, erc721ABI, useWalletClient, usePublicClient, erc20ABI } from 'wagmi'
import styles from "@/styles/Home.module.css"
import constants from '../utils/constants'
import obviousabi from '../abi/obviousabi.json'
import { useState } from "react";
import { Hex, createClient, encodeFunctionData, http, parseAbi } from 'viem'
import { polygon } from 'viem/chains'
import { UserOperation, bundlerActions, getAccountNonce, signUserOperationHashWithECDSA } from 'permissionless'
import { pimlicoPaymasterActions, pimlicoBundlerActions } from 'permissionless/actions/pimlico'
import { BigNumber } from 'ethers'
import abi from '../abi/abi.json'

const contractAddress = constants.contractAddreses['polygon'] as `0x${string}`;
const usdcAddress = constants.usdcAddresses['polygon'] as `0x${string}`;
const apiKey = process.env.NEXT_PUBLIC_PIMLICO_API_KEY || "";
const ENTRY_POINT_ADDRESS = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789"

export function MintSmartUSDC({ batchMethodName = 'executeBatchCall' }) {
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
    
    const paymasterClient = createClient({
        // ⚠️ using v2 of the API ⚠️
        transport: http(`https://api.pimlico.io/v2/polygon/rpc?apikey=${apiKey}`),
        chain: polygon
    }).extend(pimlicoPaymasterActions)

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
     
        console.log("Querying for receipts...")
        const receipt = await bundlerClient.waitForUserOperationReceipt({
            hash: userOperationHash
        })
        setPimlicoHash(receipt.receipt.transactionHash)
        return receipt
    }

    const submitMint = async () => {
        const newNonce = await getAccountNonce(publicClient, {
            entryPoint: ENTRY_POINT_ADDRESS as `0x${string}`,
            sender: address as `0x${string}`
        })

        console.log("Sponsoring a user operation with the ERC-20 paymaster...")
        // FILL OUT REMAINING USER OPERATION VALUES
        const gasPrice = await bundlerClient.getUserOperationGasPrice()

        const approveCallData = genereteApproveCallData(address as `0x${string}`);
        const mintCallData = genereteMintCallData();
        const executeCallData = encodeFunctionData({
            abi: obviousabi,
            functionName: batchMethodName,
            args: [[usdcAddress, contractAddress], [BigNumber.from("0"), BigNumber.from("0")], [approveCallData, mintCallData]],
          })

        const userOperation = {
            sender: address as `0x${string}`,
            nonce: newNonce,
            initCode: '0x' as `0x${string}`,
            callData: executeCallData,
            callGasLimit: BigInt(100_000), // hardcode it for now at a high value
            verificationGasLimit: BigInt(500_000), // hardcode it for now at a high value
            preVerificationGas: BigInt(50_000), // hardcode it for now at a high value
            maxFeePerGas: gasPrice.fast.maxFeePerGas,
            maxPriorityFeePerGas: gasPrice.fast.maxPriorityFeePerGas,
            // dummy signature
            signature:
                "0xa15569dd8f8324dbeabf8073fdec36d4b754f53ce5901e283c6de79af177dc94557fa3c9922cd7af2a96ca94402d35c39f266925ee6407aeb32b31d76978d4ba1c" as Hex
        }

        // REQUEST PIMLICO VERIFYING PAYMASTER SPONSORSHIP
        const sponsorUserOperationResult = await paymasterClient.sponsorUserOperation({
            userOperation,
            entryPoint: ENTRY_POINT_ADDRESS
        })
        
        const sponsoredUserOperation: UserOperation = {
            ...userOperation,
            preVerificationGas: sponsorUserOperationResult.preVerificationGas,
            verificationGasLimit: sponsorUserOperationResult.verificationGasLimit,
            callGasLimit: sponsorUserOperationResult.callGasLimit,
            paymasterAndData: sponsorUserOperationResult.paymasterAndData
        }
        
        console.log("Received paymaster sponsor result:", sponsorUserOperationResult, )
        
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

    const { isLoading: isMinting, isSuccess } = useWaitForTransaction({
        hash: pimlicoHash ? pimlicoHash as `0x${string}` : undefined,
      })
   
    return (
      <div>
        <button className={styles.button}  disabled={isLoading || !batchMethodName} onClick={() => submitMint?.()}>
            {isLoading ? 'Minting...' : `Sponsored Mint for USDC`}
        </button>
        {isMinting && (
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

// Sponsor the Mint
const genereteApproveCallData = (address: `0x${string}`) => {
    return encodeFunctionData({
        abi: erc20ABI,
        functionName: 'approve',
        args: [contractAddress, BigInt(100000)],
    })
}

// Sponsor the Mint
const genereteMintCallData = () => {
    return encodeFunctionData({
        abi: abi,
        functionName: 'mintInUSDC',
        args: [],
    })
}
