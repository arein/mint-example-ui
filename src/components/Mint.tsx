import * as React from 'react'
import { useAccount, usePrepareContractWrite, useContractWrite, useWaitForTransaction, erc721ABI } from 'wagmi'
import styles from "@/styles/Home.module.css"
import abi from './../abi/abi.json'
 
const contract = "0xf6fdeb9445d6fb2285cdd157c764f25661f2de30";

export function Mint() {
    const { address, isConnecting, isDisconnected } = useAccount();
	const { config, error: prepareError, isError: isPrepareError } = usePrepareContractWrite({
		address: contract,
		abi: abi,
		functionName: 'mint',
		args: [address, 1],
		enabled: Boolean(address),
	  })

      const { data, error, isError, write } = useContractWrite(config)

	const { isLoading, isSuccess } = useWaitForTransaction({
		hash: data?.hash,
	})
   
    return (
      <div>
        <button className={styles.button}  disabled={!write || isLoading} onClick={() => write?.()}>
            {isLoading ? 'Minting...' : `Mint`}
        </button>
        {isSuccess && (
            <div>
            Successfully minted your NFT!
            <div>
                <a href={`https://polygonscan.com/tx/${data?.hash}`}>Polygonscan</a>
            </div>
            </div>
        )}
        {(isPrepareError || isError) && (
        <div>Error: {(prepareError || error)?.message}</div>
      )}
      </div>
    )
  }
