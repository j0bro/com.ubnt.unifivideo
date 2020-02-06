/*
Copyright (c) 2010, Michael J. Skora
All rights reserved.
Source: http://www.umich.edu/~parsec/information/code/ip_calc.js.txt

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
* Redistributions of source code packaged with any other code to form a distributable product must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
* Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
* Neither the name of the author or other identifiers used by the author (such as nickname or avatar) may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

'use strict';

class IpCalc {
  IPv4Address(addressDotQuad, netmaskBits) {
    const split = addressDotQuad.split('.', 4);
    let byte1 = Math.max(0, Math.min(255, parseInt(split[0], 10))); /* sanity check: valid values: = 0-255 */
    let byte2 = Math.max(0, Math.min(255, parseInt(split[1], 10)));
    let byte3 = Math.max(0, Math.min(255, parseInt(split[2], 10)));
    let byte4 = Math.max(0, Math.min(255, parseInt(split[3], 10)));

    if (Number.isNaN(byte1)) { byte1 = 0; } /* fix NaN situations */
    if (Number.isNaN(byte2)) { byte2 = 0; }
    if (Number.isNaN(byte3)) { byte3 = 0; }
    if (Number.isNaN(byte4)) { byte4 = 0; }

    this.addressDotQuad = `${byte1}.${byte2}.${byte3}.${byte4}`;
    this.netmaskBits = Math.max(0, Math.min(32, parseInt(netmaskBits, 10))); /* sanity check: valid values: = 0-32 */

    this.addressInteger = this.IPv4DotquadAToIntA(this.addressDotQuad);
    // this.addressDotQuad  = this.IPv4DotquadAToIntA( this.addressInteger );
    this.addressBinStr = this.IPv4IntAToBinstrA(this.addressInteger);

    this.netmaskBinStr = this.IPv4BitsNMToBinstrNM(this.netmaskBits);
    this.netmaskInteger = this.IPv4BinstrAToIntA(this.netmaskBinStr);
    this.netmaskDotQuad = this.IPv4IntAToDotquadA(this.netmaskInteger);

    this.netaddressBinStr = this.IPv4CalcNetbcastBinStr(this.addressBinStr, this.netmaskBinStr);
    this.netaddressInteger = this.IPv4BinstrAToIntA(this.netaddressBinStr);
    this.netaddressDotQuad = this.IPv4IntAToDotquadA(this.netaddressInteger);

    this.netbcastBinStr = this.IPv4CalcNetbcastBinStr(this.addressBinStr, this.netmaskBinStr);
    this.netbcastInteger = this.IPv4BinstrAToIntA(this.netbcastBinStr);
    this.netbcastDotQuad = this.IPv4IntAToDotquadA(this.netbcastInteger);
  }

  /* In some versions of JavaScript subnet calculators they use bitwise operations to shift the values left.
     Unfortunately JavaScript converts to a 32-bit signed integer when you mess with bits, which leaves you with the sign + 31 bits.
     For the first byte this means converting back to an integer results in a negative value for values 128 and higher since the leftmost bit, the sign, becomes 1.
     Using the 64-bit float allows us to display the integer value to the user. */

  /* dotted-quad IP to integer */
  IPv4DotquadAToIntA(strbits) {
    const split = strbits.split('.', 4);
    return (
      parseFloat(split[0] * 16777216) /* 2^24 */
      + parseFloat(split[1] * 65536) /* 2^16 */
      + parseFloat(split[2] * 256) /* 2^8  */
      + parseFloat(split[3])
    );
  }

  /* integer IP to dotted-quad */
  IPv4IntAToDotquadA(strnum) {
    const byte1 = (strnum >>> 24);
    const byte2 = (strnum >>> 16) & 255;
    const byte3 = (strnum >>> 8) & 255;
    const byte4 = strnum & 255;

    return (`${byte1}.${byte2}.${byte3}.${byte4}`);
  }

  /* integer IP to binary string representation */
  IPv4IntAToBinstrA(strnum) {
    let numStr = strnum.toString(2); /* Initialize return value as string */
    const numZeros = 32 - numStr.length; /* Calculate no. of zeros */
    if (numZeros > 0) { for (let i = 1; i <= numZeros; i++) { numStr = `0${numStr}`; } }
    return numStr;
  }

  /* binary string IP to integer representation */
  IPv4BinstrAToIntA(binstr) {
    return parseInt(binstr, 2);
  }

  /* convert # of bits to a string representation of the binary value */
  IPv4BitsNMToBinstrNM(bitsNM) {
    let bitString = '';
    let numberOfOnes = bitsNM;
    let numberOfZeros;

    while (numberOfOnes--) bitString += '1'; /* fill in ones */
    numberOfZeros = 32 - bitsNM;
    while (numberOfZeros--) bitString += '0'; /* pad remaining with zeros */

    return bitString;
  }

  /* The IPv4_Calc_* functions operate on string representations of the binary value because I don't trust JavaScript's sign + 31-bit bitwise functions. */
  /* logical AND between address & netmask */
  IPv4CalcNetaddrBinStr(addressBinStr, netmaskBinStr) {
    let netaddressBinStr = '';
    let aBit = 0; let nmBit = 0;

    for (let pos = 0; pos < 32; pos++) {
      aBit = addressBinStr.substr(pos, 1);
      nmBit = netmaskBinStr.substr(pos, 1);
      if (aBit === nmBit) { netaddressBinStr += aBit.toString(); } else { netaddressBinStr += '0'; }
    }
    return netaddressBinStr;
  }

  /* logical OR between address & NOT netmask */
  IPv4CalcNetbcastBinStr(addressBinStr, netmaskBinStr) {
    let netbcastBinStr = '';
    let aBit = 0; let nmBit = 0;

    for (let pos = 0; pos < 32; pos++) {
      aBit = parseInt(addressBinStr.substr(pos, 1), 10);
      nmBit = parseInt(netmaskBinStr.substr(pos, 1), 10);

      if (nmBit) { nmBit = 0; } else { nmBit = 1; } /* flip netmask bits */
      if (aBit || nmBit) { netbcastBinStr += '1'; } else { netbcastBinStr += '0'; }
    }
    return netbcastBinStr;
  }

  /* included as an example alternative for converting 8-bit bytes to an integer in IPv4DotquadAToIntA */
  IPv4BitShiftLeft(mask, bits) {
    return (mask * (bits ** 2));
  }

  /* used for display purposes */
  IPv4BinaryDotQuad(binaryString) {
    return (`${binaryString.substr(0, 8)}.${binaryString.substr(8, 8)}.${binaryString.substr(16, 8)}.${binaryString.substr(24, 8)}`);
  }
}

module.exports = IpCalc;
