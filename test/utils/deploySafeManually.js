// Set up manually a Safe for being fully usable in Circles
export default async function deploySafeManually({ account, nonce }, core) {
  const {
    contracts: { safeMaster, proxyFactory },
    options: { fallbackHandlerAddress, proxyFactoryAddress, safeMasterAddress },
    safe,
    utils,
  } = core;
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
  const safeAddress = await safe.predictAddress(account, { nonce });
  // Deploy manually a Safe bypassing the 3 trust connections check
  return utils
    .sendTransaction({
      target: proxyFactoryAddress,
      data: proxyFactory.methods
        .createProxyWithNonce(
          safeMasterAddress,
          safeMaster.methods
            .setup(
              [account.address],
              1,
              ZERO_ADDRESS,
              '0x',
              fallbackHandlerAddress,
              ZERO_ADDRESS,
              0,
              ZERO_ADDRESS,
            )
            .encodeABI(),
          nonce,
        )
        .encodeABI(),
    })
    .then(() => safeAddress);
}