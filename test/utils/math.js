import web3 from "./web3";

export const decimalsMultiplier = (new web3.utils.BN(10)).pow( new web3.utils.BN(18));
export const convertToBaseUnit = number => {
    return new web3.utils.BN(number).mul(decimalsMultiplier);
}