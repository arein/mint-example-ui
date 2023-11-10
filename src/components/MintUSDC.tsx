import * as React from 'react'
import { useAccount, usePrepareContractWrite, useContractWrite, useWaitForTransaction, erc721ABI, erc20ABI, useContractRead, useFeeData } from 'wagmi'
import styles from "@/styles/Home.module.css"
import constants from '../utils/constants'
import abi from '../abi/abi.json'

const contractAddress = constants.contractAddreses['polygon'] as `0x${string}`;
const usdcAddress = constants.usdcAddresses['polygon'] as `0x${string}`;

export function MintUSDC() {
    const { address, isConnecting, isDisconnected } = useAccount();
    
    // 1. Read from ERC20 contract. Does spender (Mint contract) have an allowance?
    const { data: allowance, isError: isAllowanceError, error: allowanceError, refetch } = useContractRead({
        address: usdcAddress,
        abi: erc20ABI,
        chainId: 137,
        functionName: "allowance",
        args: [address as `0x${string}`, contractAddress],
    });

    // 2. (Only if no allowance): Write to ERC20, approve Mint contract to spend max integer
    const { config: approveConfig } = usePrepareContractWrite({
        address: usdcAddress,
        abi: erc20ABI,
        chainId: 137,
        functionName: "approve",
        args: [contractAddress, BigInt(100000)],
        // maxFeePerGas: parseWei('400'),
        // maxPriorityFeePerGas: parseWei('2'),
    });

    const {
        data: approveContractResult,
        writeAsync: approveAsync,
        isError: isApproveError,
        error: approveError,
    } = useContractWrite(approveConfig);

    const { isLoading: isApproving } = useWaitForTransaction({
        hash: approveContractResult ? approveContractResult.hash : undefined,
        onSuccess(data) {
            refetch();
        },
    });

    const { config, error: prepareError, isError: isPrepareError } = usePrepareContractWrite({
      address: contractAddress as `0x${string}`,
      abi: abi,
      functionName: 'mintInUSDC',
      args: [],
      enabled: Boolean(address && allowance && allowance > 0),
      })
  
    const { data: mintContractResult, error: mintError, isError: isMintError, write: mint } = useContractWrite(config)
  
    const { isLoading: isMinting, isSuccess } = useWaitForTransaction({
      hash: mintContractResult?.hash,
    })
   
    return (
      <div>
        <button className={styles.button} disabled={isApproving || isMinting} onClick={() => (allowance && allowance > 0 ? mint : approveAsync)?.()}>
            {allowance ? 'Mint for USDC' : `Approve USDC to Mint`}
        </button>

        { (isApproving || isMinting) && <div>
            <a href={`https://polygonscan.com/tx/${(approveContractResult || mintContractResult)?.hash}`}>Transaction in progress..</a>
        </div>}
        {isSuccess && (
            <div>
            Successfully minted your NFT!
            <div>
                <a href={`https://polygonscan.com/tx/${mintContractResult?.hash}`}>Polygonscan</a>
            </div>
            </div>
        )}

        {(isAllowanceError || isApproveError || isMintError || isPrepareError) && (
          <div>Error: {(allowanceError || approveError || mintError || prepareError)?.message}</div>
        )}
      </div>
    )
  }
