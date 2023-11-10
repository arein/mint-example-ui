import * as React from 'react'
import { useAccount, usePrepareContractWrite, useContractWrite, useWaitForTransaction, erc721ABI } from 'wagmi'
import styles from "@/styles/Home.module.css"
import abi from './../abi/abi.json'
import constants from '../utils/constants'

const contractAddress = constants.contractAddreses['polygon'] as `0x${string}`;

export function Mint() {
    const { address, isConnecting, isDisconnected } = useAccount();
	const { config, error: prepareError, isError: isPrepareError } = usePrepareContractWrite({
		address: contractAddress,
		abi: abi,
		functionName: 'safeMint',
		args: [address],
		enabled: Boolean(address),
	  })

  const { data, error, isError, write } = useContractWrite(config)

	const { isLoading, isSuccess } = useWaitForTransaction({
		hash: data?.hash,
	})
   
    return (
      <div>
        <button className={styles.button}  disabled={!write || isLoading} onClick={() => write?.()}>
            {isLoading ? 'Minting...' : `Mint for Free`}
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
