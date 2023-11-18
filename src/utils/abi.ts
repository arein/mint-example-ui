import { useEffect, useState } from "react";

export const useContractABI = (contractAddress: `0x${string}`) => {
    const [contractABI, setContractABI] = useState(null);
  
    useEffect(() => {
      const fetchContractABI = async () => {
        const response = await fetch(`https://abidata.net/${contractAddress}?network=polygon`);
        const json = await response.json();
        setContractABI(json.abi);
      };
  
      fetchContractABI();
    }, [contractAddress]);
  
    return contractABI;
  };
