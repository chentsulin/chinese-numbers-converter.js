/**
 * Converter for Chinese numbers like 1000萬.
 * @param {string} source - The original number string, e.g. 1000萬.
 * @returns {ChineseNumber}
 * @constructor
 */
var ChineseNumber = function (source) {
  this.source = source;
  return this;
};

/** Chinese number characters and their Arabic equivalent. */
ChineseNumber.numbers = {
  '零': 0,
  '〇': 0,
  '０': 0,
  '洞': 0,

  '壹': 1,
  '一': 1,
  '幺': 1,
  '１': 1,

  '貳': 2,
  '贰': 2,
  '二': 2,
  '两': 2,
  '兩': 2,
  '２': 2,

  '參': 3,
  '叁': 3,
  '三': 3,
  '仨': 3,
  '３': 3,


  '肆': 4,
  '四': 4,
  '４': 4,

  '伍': 5,
  '五': 5,
  '５': 5,

  '陸': 6,
  '陆': 6,
  '六': 6,
  '６': 6,

  '柒': 7,
  '七': 7,
  '拐': 7,
  '７': 7,

  '捌': 8,
  '八': 8,
  '８': 8,

  '玖': 9,
  '九': 9,
  '勾': 9,
  '９': 9,

  '拾': '*10',
  '十': '*10',
  '呀': '*10',
  '廿': '*20',
  '卅': '*30',
  '卌': '*40',
  '佰': '*100',
  '百': '*100',
  '皕': '*200',
  '仟': '*1000',
  '千': '*1000',
  '萬': '*10000',
  '萬': '*10000',
  '万': '*10000',
  '億': '*100000000',
  '億': '*100000000',
  '亿': '*100000000',
};
ChineseNumber.characters = Object.keys(ChineseNumber.numbers);
ChineseNumber.afterManMultipliers = ['萬', '萬', '万', '億', '億', '亿'];

/**
 * Returns the result of the conversion of Chinese number into an `Integer`.
 * @returns {number} The Chinese number converted to integer.
 */
ChineseNumber.prototype.toInteger = function () {
  var result = 0;
  var pairs = [];
  var str = this.source.toString();
  var currentPair = [];

  str = str.replace(/[,\s]/g, ''); // remove commas, spaces

  // If the number begins with arabic numerals, parse and remove them first.
  // Example: 83萬. This number will be multiplied by the remaining part at
  // the end of the function.
  // We're using parseFloat here instead of parseInt in order to have limited
  // support for decimals, e.g. "3.5萬"
  var leadingNumber = parseFloat(str);
  if (!isNaN(leadingNumber)) {
    str = str.replace(leadingNumber.toString(), '');
  }

  // Now parse the actual Chinese, character by character:
  var len = str.length;
  for (var i = 0; i < len; i++) {
    if (ChineseNumber.numbers[str[i]] !== undefined) {
      var arabic = ChineseNumber.numbers[str[i]]; // e.g. for '三', get 3

      if (typeof (arabic) === 'number') {
        if (currentPair.length !== 0) {
          // E.g. case like 三〇〇三 instead of 三千...
          // In this case, just concatenate the string, e.g. "2" + "0" = "20"
          currentPair[0] = parseInt(currentPair[0].toString() + arabic.toString());
        } else {
          currentPair.push(arabic);
        }
      } else if (typeof (arabic) === 'string' && arabic.indexOf('*') === 0) {
        // case like '*10000'
        var action = arabic[0];

        // remove '*' and convert to number
        arabic = parseInt(arabic.replace('*', ''));

        currentPair.push(arabic);

        if (i === 0 && action === '*') {
          // This is a case like 2千萬", where the first character will be 千:
          currentPair.push(1);
          pairs.push(currentPair);
          currentPair = [];
        } else {
          // accumulated two parts of a pair which will be multipled, e.g. 二 + 十
          if (currentPair.length === 2) {
            pairs.push(currentPair);
            currentPair = [];
          } else if (currentPair.length === 1) {
            if (ChineseNumber.afterManMultipliers.indexOf(str[i]) !== -1) {
              // For cases like '萬' in '一千萬' - multiply everything we had
              // so far (like 一千) by the current digit (like 萬).
              var numbersSoFar = 0;

              pairs.forEach(function (pair) {
                numbersSoFar += pair[0] * pair[1];
              });

              // The leadingNumber is for cases like 1000萬.
              if (!isNaN(leadingNumber)) {
                numbersSoFar *= leadingNumber;
                leadingNumber = NaN;
              }

              // Replace all previous pairs with the new one:
              pairs = [[numbersSoFar, arabic]]; // e.g. [[1000, 10000]]
              currentPair = [];
            } else {
              // For cases like 十 in 十二:
              currentPair.push(1);
              pairs.push(currentPair);
              currentPair = [];
            }
          }
        }
      }
    }
  }

  // If number ends in 1-9, e.g. 二十二, we have one number left behind - 
  // add it too and multiply by 1:
  if (currentPair.length === 1) {
    currentPair.push(1);
    pairs.push(currentPair);
  }

  // Multiply all pairs:
  pairs.forEach(function (pair) {
    result += pair[0] * pair[1];
  });

  // For cases like 83萬
  if (!isNaN(leadingNumber)) {
    if (pairs.length === 0) {
      result = leadingNumber; // otherwise multiplying by zero, e.g. "800 " => 0 * 800
    } else {
      result *= leadingNumber;
    }
  }

  return result;
};

/**
 * Checks whether the character is part of a number (either a number itself, or
 * a space/comma), or a part of unrelated text.
 * @param {string} character - A string containing only one character to be
 *    checked.
 * @returns {boolean} True if the `character` is a Chinese or Arabic number
 *    or a character like "comma" and "space", which should not delimit two 
 *    numbers; rather, they mean that the number may continue. E.g. "6,000" or
 *    "6 000".
 */
ChineseNumber.isNumberOrSpace = function (character) {
  // Make sure `character`.length is exactly 1:
  if (character === null || character === undefined || character.length !== 1) {
    throw 'isNumberOrSpace() must receive exactly one character for checking.';
  }

  // Check for Arabic numbers, commas and spaces:
  if (character.match(/[0-9,\s]/)) {
    return true;
  }

  // Check if the character is on the list of Chinese number characters:
  if (ChineseNumber.characters.indexOf(character) === -1) {
    return false;
  } else {
    return true;
  }
}

/**
 * Checks whether a character is a Chinese number character.
 * @param {number|string} A single character to be checked.
 * @returns {boolean} True if it's a Chinese number character or Chinese-style
 * Arabic numbers (０-９).
 */
ChineseNumber.isChineseNumber = function (character) {
  if (character === null || character === undefined || character.toString().length !== 1) {
    throw 'Function isChineseNumber expects exactly one character.';
  }

  return ChineseNumber.characters.indexOf(character) !== -1;
};

/**
 * Converts multiple Chinese numbers in a string into Arabic numbers, and
 * returns the translated string containing the original text but with Arabic
 * numbers only.
 * @returns {string} The translated string with Arabic numbers only.
 */
ChineseNumber.prototype.toArabicString = function () {
  /**
   *  This will be the result of this function, the string will all Chinese
   *  numbers translated to Arabic.
   */
  var translated = '';

  /**
   * Temporary variable to accumulate the Chinese number discovered within a
   * string.
   */
  var chineseNumber = '';

  /** Whether the character in the previous loop iteration was a number. */
  var previousCharacterIsNumber = false;

  /** Whether the character in the previous loop iteration was a Chinese
      number. This is because we want to determine the border between two
      numbers such as 1000萬800呎. */
  var previousCharacterIsChineseNumber = false;

  // Loop over each character in the string and: 
  // - if it's a normal character, just keep looping and adding characters to
  //   the translated string.
  // - if it's a number, keep looping until we find the first non-number
  //   character. Then, translate the entire chineseNumber string into an
  //   Arabic number and place it back into the translated string.
  this.source.split('').forEach(function (character) {
    if (ChineseNumber.isNumberOrSpace(character)) {
      if (previousCharacterIsChineseNumber && ChineseNumber.isChineseNumber(character) === false) {
        // Special case: we are trying to determine a border between two mixed
        // Arabic+Chinese numbers, such as 1000萬<we are here>800呎.
        // Now we found that previous character was a Chinese number, but the
        // current character is an Arabic number.

        // First, translate the number accumulated so far, e.g. 1000萬
        translated += new ChineseNumber(chineseNumber).toInteger();

        // Add a space, otherwise 1000萬800呎 will become 10000000800呎
        translated += ' ';

        // Immediately start assembling a new number, e.g. 800:
        chineseNumber = '';
        chineseNumber += character;
      } else {
        // Normal case:
        chineseNumber += character;
      }

      previousCharacterIsNumber = true;
      previousCharacterIsChineseNumber = ChineseNumber.isChineseNumber(character);
    } else {
      if (previousCharacterIsNumber) {
        // We reached the end of a Chinese number. Send it for translation now:
        clearChineseNumber = chineseNumber.replace(/[,\s]/g, '');
        if (clearChineseNumber === '') {
          // If the 'number' we assembled is actually something like comma, 
          // space, or multiple commas and spaces:
          translated += chineseNumber;
        } else {
          // Normal case - it's a real number:
          translated += new ChineseNumber(chineseNumber).toInteger();
        }
      }

      translated += character;

      // Reset variables:
      chineseNumber = '';
      previousCharacterIsNumber = false;
      previousCharacterIsChineseNumber = false;
    }
  });

  // If the string ends with a number, we didn't trigger the translation of the
  // last bit yet. So translate it now.
  if (chineseNumber) {
    translated += new ChineseNumber(chineseNumber).toInteger();
  }

  return translated;
};

/**
 * Check whether a character is an Arabic number [0-9] and not a Chinese
 * number or another character.
 * @returns {boolean} True if character is from 0 to 9.
 */
ChineseNumber.isArabicNumber = function (numberToCheck) {
  if (numberToCheck === null || numberToCheck === undefined || numberToCheck.toString().length !== 1) {
    throw 'Function isArabicNumber expects exactly one character.';
  }

  var arabicNumbers = '0123456789０１２３４５６７８９';
  return arabicNumbers.indexOf(numberToCheck) !== -1; // true if found
};