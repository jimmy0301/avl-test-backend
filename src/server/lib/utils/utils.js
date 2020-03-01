const chunk = (array, size) => {
  const chunkArr = [];
  let index = 0;

  while (index < array.length) {
    chunkArr.push(array.slice(index, size + index));
    index += size;
  }

  return chunkArr;
};

const validTimeRange = (timeStart1, timeStart2, timeTo1, timeTo2) => {
  if (timeStart1 >= timeTo1) {
    return false;
  }

  if (timeStart2 >= timeTo2) {
    return false;
  }

  if (timeStart1 <= timeStart2 && timeTo1 >= timeTo2) {
    return true;
  }

  return false;
};

const genBillingEngineUrl = (protocolArr, hostArr, portArr) => {
  const result = [];

  for (let i = 0; i < protocolArr.length; i += 1) {
    if (portArr[i]) {
      result.push(`${protocolArr[i]}://${hostArr[i]}:${portArr[i]}`);
    } else {
      result.push(`${protocolArr[i]}://${hostArr[i]}`);
    }
  }

  return result;
};

export { chunk, validTimeRange, genBillingEngineUrl };
