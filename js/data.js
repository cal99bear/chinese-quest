/* =========================================================================
   龍之華語 Chinese Quest — content data
   Traditional Chinese (Taiwan / MOE standard) for primary-age learners at
   international schools. Pinyin is the primary reading aid (international
   school convention); Zhuyin (注音) is available as an optional toggle.

   Word record:
     zh  = Traditional Chinese
     py  = pinyin with tone marks, one syllable per character, space separated
     zy  = zhuyin, one syllable per character, space separated (˙ = neutral)
     en  = English meaning
     em  = emoji picture
     mn  = optional English memory hook (mnemonic)
   ========================================================================= */

const THEMES = [
  {
    id: 'numbers', zh: '數字', en: 'Numbers', emoji: '🔢', color: '#ff8a3d',
    words: [
      { zh: '一', py: 'yī', zy: 'ㄧ', en: 'one', em: '1️⃣', mn: 'One single line = one finger. 一 = 1' },
      { zh: '二', py: 'èr', zy: 'ㄦˋ', en: 'two', em: '2️⃣', mn: 'Two lines, two fingers. 二 = 2' },
      { zh: '三', py: 'sān', zy: 'ㄙㄢ', en: 'three', em: '3️⃣', mn: 'Three lines, three fingers. 三 = 3' },
      { zh: '四', py: 'sì', zy: 'ㄙˋ', en: 'four', em: '4️⃣', mn: 'A square window has 4 sides. 四 = 4' },
      { zh: '五', py: 'wǔ', zy: 'ㄨˇ', en: 'five', em: '5️⃣', mn: 'A hand with 5 fingers inside a box. 五 = 5' },
      { zh: '六', py: 'liù', zy: 'ㄌㄧㄡˋ', en: 'six', em: '6️⃣', mn: 'A little roof over two wiggly legs. 六 = 6' },
      { zh: '七', py: 'qī', zy: 'ㄑㄧ', en: 'seven', em: '7️⃣', mn: 'A line with a hook — it really looks like a 7!' },
      { zh: '八', py: 'bā', zy: 'ㄅㄚ', en: 'eight', em: '8️⃣', mn: 'Two legs kicked wide apart. 八 = 8' },
      { zh: '九', py: 'jiǔ', zy: 'ㄐㄧㄡˇ', en: 'nine', em: '9️⃣', mn: 'A bent arm with a hook — 九 looks like 9.' },
      { zh: '十', py: 'shí', zy: 'ㄕˊ', en: 'ten', em: '🔟', mn: 'A cross shape: 10 fingers crossing!' },
      { zh: '百', py: 'bǎi', zy: 'ㄅㄞˇ', en: 'hundred', em: '💯', mn: '一 (one) sitting on 白 (white) = one hundred.' }
    ]
  },
  {
    id: 'colors', zh: '顏色', en: 'Colors', emoji: '🎨', color: '#e0447c',
    words: [
      { zh: '紅色', py: 'hóng sè', zy: 'ㄏㄨㄥˊ ㄙㄜˋ', en: 'red', em: '🔴' },
      { zh: '藍色', py: 'lán sè', zy: 'ㄌㄢˊ ㄙㄜˋ', en: 'blue', em: '🔵' },
      { zh: '綠色', py: 'lǜ sè', zy: 'ㄌㄩˋ ㄙㄜˋ', en: 'green', em: '🟢' },
      { zh: '黃色', py: 'huáng sè', zy: 'ㄏㄨㄤˊ ㄙㄜˋ', en: 'yellow', em: '🟡' },
      { zh: '黑色', py: 'hēi sè', zy: 'ㄏㄟ ㄙㄜˋ', en: 'black', em: '⚫' },
      { zh: '白色', py: 'bái sè', zy: 'ㄅㄞˊ ㄙㄜˋ', en: 'white', em: '⚪' },
      { zh: '紫色', py: 'zǐ sè', zy: 'ㄗˇ ㄙㄜˋ', en: 'purple', em: '🟣' },
      { zh: '橘色', py: 'jú sè', zy: 'ㄐㄩˊ ㄙㄜˋ', en: 'orange', em: '🟠' },
      { zh: '粉紅色', py: 'fěn hóng sè', zy: 'ㄈㄣˇ ㄏㄨㄥˊ ㄙㄜˋ', en: 'pink', em: '💗' },
      { zh: '彩虹', py: 'cǎi hóng', zy: 'ㄘㄞˇ ㄏㄨㄥˊ', en: 'rainbow', em: '🌈' }
    ]
  },
  {
    id: 'animals', zh: '動物', en: 'Animals', emoji: '🐾', color: '#12b886',
    words: [
      { zh: '貓', py: 'māo', zy: 'ㄇㄠ', en: 'cat', em: '🐱', mn: 'The animal radical 犭 + 苗. A cat says māo!' },
      { zh: '狗', py: 'gǒu', zy: 'ㄍㄡˇ', en: 'dog', em: '🐶', mn: 'Animal radical 犭 + 句. A dog barks gǒu!' },
      { zh: '魚', py: 'yú', zy: 'ㄩˊ', en: 'fish', em: '🐟', mn: 'A fish standing up: head on top, body, tail fin.' },
      { zh: '鳥', py: 'niǎo', zy: 'ㄋㄧㄠˇ', en: 'bird', em: '🐦', mn: 'A bird with a beak on top and a tail below.' },
      { zh: '馬', py: 'mǎ', zy: 'ㄇㄚˇ', en: 'horse', em: '🐴', mn: 'A horse with a flowing mane and four legs.' },
      { zh: '牛', py: 'niú', zy: 'ㄋㄧㄡˊ', en: 'cow', em: '🐮', mn: 'A cow head with two horns sticking up.' },
      { zh: '羊', py: 'yáng', zy: 'ㄧㄤˊ', en: 'sheep', em: '🐑', mn: 'A sheep head with two curly horns.' },
      { zh: '豬', py: 'zhū', zy: 'ㄓㄨ', en: 'pig', em: '🐷', mn: 'Animal radical 犭 + 者. A pig says zhū-zhū!' },
      { zh: '兔子', py: 'tù zi', zy: 'ㄊㄨˋ ˙ㄗ', en: 'rabbit', em: '🐰' },
      { zh: '大象', py: 'dà xiàng', zy: 'ㄉㄚˋ ㄒㄧㄤˋ', en: 'elephant', em: '🐘' },
      { zh: '熊貓', py: 'xióng māo', zy: 'ㄒㄩㄥˊ ㄇㄠ', en: 'panda', em: '🐼' },
      { zh: '老虎', py: 'lǎo hǔ', zy: 'ㄌㄠˇ ㄏㄨˇ', en: 'tiger', em: '🐯' }
    ]
  },
  {
    id: 'food', zh: '食物', en: 'Food', emoji: '🍎', color: '#f59f00',
    words: [
      { zh: '蘋果', py: 'píng guǒ', zy: 'ㄆㄧㄥˊ ㄍㄨㄛˇ', en: 'apple', em: '🍎' },
      { zh: '香蕉', py: 'xiāng jiāo', zy: 'ㄒㄧㄤ ㄐㄧㄠ', en: 'banana', em: '🍌' },
      { zh: '西瓜', py: 'xī guā', zy: 'ㄒㄧ ㄍㄨㄚ', en: 'watermelon', em: '🍉' },
      { zh: '米飯', py: 'mǐ fàn', zy: 'ㄇㄧˇ ㄈㄢˋ', en: 'rice', em: '🍚' },
      { zh: '麵包', py: 'miàn bāo', zy: 'ㄇㄧㄢˋ ㄅㄠ', en: 'bread', em: '🍞' },
      { zh: '麵', py: 'miàn', zy: 'ㄇㄧㄢˋ', en: 'noodles', em: '🍜' },
      { zh: '蛋', py: 'dàn', zy: 'ㄉㄢˋ', en: 'egg', em: '🥚', mn: 'An egg shell with a tiny creature 虫 wriggling inside.' },
      { zh: '牛奶', py: 'niú nǎi', zy: 'ㄋㄧㄡˊ ㄋㄞˇ', en: 'milk', em: '🥛' },
      { zh: '水', py: 'shuǐ', zy: 'ㄕㄨㄟˇ', en: 'water', em: '💧', mn: 'A splashing river with four drops flying off.' },
      { zh: '茶', py: 'chá', zy: 'ㄔㄚˊ', en: 'tea', em: '🍵', mn: 'Grass 艹 + 人 + 木: leaves picked from a bush.' },
      { zh: '蛋糕', py: 'dàn gāo', zy: 'ㄉㄢˋ ㄍㄠ', en: 'cake', em: '🍰' },
      { zh: '冰淇淋', py: 'bīng qí lín', zy: 'ㄅㄧㄥ ㄑㄧˊ ㄌㄧㄣˊ', en: 'ice cream', em: '🍦' }
    ]
  },
  {
    id: 'nature', zh: '大自然', en: 'Nature', emoji: '🌳', color: '#2f9e44',
    words: [
      { zh: '太陽', py: 'tài yáng', zy: 'ㄊㄞˋ ㄧㄤˊ', en: 'sun', em: '☀️' },
      { zh: '月亮', py: 'yuè liang', zy: 'ㄩㄝˋ ˙ㄌㄧㄤ', en: 'moon', em: '🌙' },
      { zh: '星星', py: 'xīng xing', zy: 'ㄒㄧㄥ ˙ㄒㄧㄥ', en: 'star', em: '⭐' },
      { zh: '雲', py: 'yún', zy: 'ㄩㄣˊ', en: 'cloud', em: '☁️', mn: 'Rain 雨 on top of swirling cloud shapes.' },
      { zh: '雨', py: 'yǔ', zy: 'ㄩˇ', en: 'rain', em: '🌧️', mn: 'Raindrops falling inside a window frame.' },
      { zh: '雪', py: 'xuě', zy: 'ㄒㄩㄝˇ', en: 'snow', em: '❄️', mn: 'Rain 雨 + a hand 彐 sweeping the snow away.' },
      { zh: '山', py: 'shān', zy: 'ㄕㄢ', en: 'mountain', em: '⛰️', mn: 'Three mountain peaks standing together.' },
      { zh: '樹', py: 'shù', zy: 'ㄕㄨˋ', en: 'tree', em: '🌳', mn: 'A tree 木 with a little drum on its side.' },
      { zh: '花', py: 'huā', zy: 'ㄏㄨㄚ', en: 'flower', em: '🌸', mn: 'Grass 艹 + 化 (change): grass changes into a flower.' },
      { zh: '火', py: 'huǒ', zy: 'ㄏㄨㄛˇ', en: 'fire', em: '🔥', mn: 'A campfire with two sparks flying up.' },
      { zh: '海', py: 'hǎi', zy: 'ㄏㄞˇ', en: 'sea', em: '🌊', mn: 'Water 氵 + 每 (every): every drop makes the sea.' }
    ]
  },
  {
    id: 'body', zh: '身體', en: 'Body', emoji: '🖐️', color: '#7048e8',
    words: [
      { zh: '眼睛', py: 'yǎn jing', zy: 'ㄧㄢˇ ˙ㄐㄧㄥ', en: 'eye', em: '👁️' },
      { zh: '耳朵', py: 'ěr duo', zy: 'ㄦˇ ˙ㄉㄨㄛ', en: 'ear', em: '👂' },
      { zh: '鼻子', py: 'bí zǐ', zy: 'ㄅㄧˊ ㄗˇ', en: 'nose', em: '👃' },
      { zh: '嘴巴', py: 'zuǐ ba', zy: 'ㄗㄨㄟˇ ˙ㄅㄚ', en: 'mouth', em: '👄' },
      { zh: '舌頭', py: 'shé tou', zy: 'ㄕㄜˊ ˙ㄊㄡ', en: 'tongue', em: '👅' },
      { zh: '牙齒', py: 'yá chǐ', zy: 'ㄧㄚˊ ㄔˇ', en: 'tooth', em: '🦷' },
      { zh: '頭髮', py: 'tóu fǎ', zy: 'ㄊㄡˊ ㄈㄚˇ', en: 'hair', em: '💇' },
      { zh: '手', py: 'shǒu', zy: 'ㄕㄡˇ', en: 'hand', em: '✋', mn: 'A hand with five fingers reaching up.' },
      { zh: '腳', py: 'jiǎo', zy: 'ㄐㄧㄠˇ', en: 'foot', em: '🦶', mn: 'Flesh 月 + 却: the part of you that stands.' },
      { zh: '心', py: 'xīn', zy: 'ㄒㄧㄣ', en: 'heart', em: '❤️', mn: 'A heart shape with three little dots — 心 is the heart, and also your feelings.' }
    ]
  },
  {
    id: 'school', zh: '學校', en: 'School', emoji: '🏫', color: '#1c7ed6',
    words: [
      { zh: '書', py: 'shū', zy: 'ㄕㄨ', en: 'book', em: '📚', mn: 'A hand 聿 writing on pages 曰 — a book.' },
      { zh: '筆', py: 'bǐ', zy: 'ㄅㄧˇ', en: 'pen', em: '🖊️', mn: 'Bamboo 竹 handle on top, hair 毛 brush below.' },
      { zh: '鉛筆', py: 'qiān bǐ', zy: 'ㄑㄧㄢ ㄅㄧˇ', en: 'pencil', em: '✏️' },
      { zh: '尺', py: 'chǐ', zy: 'ㄔˇ', en: 'ruler', em: '📏', mn: 'A measuring stick with a mark on it.' },
      { zh: '橡皮擦', py: 'xiàng pí cā', zy: 'ㄒㄧㄤˋ ㄆㄧˊ ㄘㄚ', en: 'eraser', em: '🧽' },
      { zh: '書包', py: 'shū bāo', zy: 'ㄕㄨ ㄅㄠ', en: 'backpack', em: '🎒' },
      { zh: '椅子', py: 'yǐ zi', zy: 'ㄧˇ ˙ㄗ', en: 'chair', em: '🪑' },
      { zh: '學校', py: 'xué xiào', zy: 'ㄒㄩㄝˊ ㄒㄧㄠˋ', en: 'school', em: '🏫' },
      { zh: '老師', py: 'lǎo shī', zy: 'ㄌㄠˇ ㄕ', en: 'teacher', em: '🧑‍🏫' },
      { zh: '同學', py: 'tóng xué', zy: 'ㄊㄨㄥˊ ㄒㄩㄝˊ', en: 'classmate', em: '🧑‍🎓' },
      { zh: '電腦', py: 'diàn nǎo', zy: 'ㄉㄧㄢˋ ㄋㄠˇ', en: 'computer', em: '💻' }
    ]
  },
  {
    id: 'actions', zh: '動作', en: 'Actions', emoji: '🏃', color: '#f76707',
    words: [
      { zh: '吃', py: 'chī', zy: 'ㄔ', en: 'eat', em: '🍽️', mn: 'Mouth 口 + 乞: what your mouth loves to do.' },
      { zh: '喝', py: 'hē', zy: 'ㄏㄜ', en: 'drink', em: '🥤', mn: 'Mouth 口 + 曷: drink with your mouth.' },
      { zh: '跑', py: 'pǎo', zy: 'ㄆㄠˇ', en: 'run', em: '🏃', mn: 'Foot 足 + 包: your feet carry you fast.' },
      { zh: '走', py: 'zǒu', zy: 'ㄗㄡˇ', en: 'walk', em: '🚶', mn: 'A person striding with legs wide apart.' },
      { zh: '看', py: 'kàn', zy: 'ㄎㄢˋ', en: 'look', em: '👀', mn: 'A hand shading the eye 目, looking far away.' },
      { zh: '聽', py: 'tīng', zy: 'ㄊㄧㄥ', en: 'listen', em: '🎧', mn: 'An ear 耳 on the left — use it to listen!' },
      { zh: '說', py: 'shuō', zy: 'ㄕㄨㄛ', en: 'speak', em: '🗣️', mn: 'The words radical 言 on the left, 兌 on the right — 說 means to speak.' },
      { zh: '讀', py: 'dú', zy: 'ㄉㄨˊ', en: 'read', em: '📖', mn: 'The words radical 言 on the left — 讀 means to read what is written.' },
      { zh: '玩', py: 'wán', zy: 'ㄨㄢˊ', en: 'play', em: '🎮', mn: 'Jade 王 + 元: playing with a treasure.' },
      { zh: '睡覺', py: 'shuì jiào', zy: 'ㄕㄨㄟˋ ㄐㄧㄠˋ', en: 'sleep', em: '😴' },
      { zh: '唱歌', py: 'chàng gē', zy: 'ㄔㄤˋ ㄍㄜ', en: 'sing', em: '🎤' },
      { zh: '跳舞', py: 'tiào wǔ', zy: 'ㄊㄧㄠˋ ㄨˇ', en: 'dance', em: '💃' }
    ]
  },
  {
    id: 'family', zh: '家人', en: 'Family', emoji: '👨‍👩‍👧', color: '#c2255c',
    words: [
      { zh: '爸爸', py: 'bà ba', zy: 'ㄅㄚˋ ˙ㄅㄚ', en: 'dad', em: '👨' },
      { zh: '媽媽', py: 'mā ma', zy: 'ㄇㄚ ˙ㄇㄚ', en: 'mom', em: '👩' },
      { zh: '哥哥', py: 'gē ge', zy: 'ㄍㄜ ˙ㄍㄜ', en: 'older brother', em: '👦' },
      { zh: '姊姊', py: 'jiě jie', zy: 'ㄐㄧㄝˇ ˙ㄐㄧㄝ', en: 'older sister', em: '👧' },
      { zh: '弟弟', py: 'dì di', zy: 'ㄉㄧˋ ˙ㄉㄧ', en: 'younger brother', em: '🧒' },
      { zh: '妹妹', py: 'mèi mei', zy: 'ㄇㄟˋ ˙ㄇㄟ', en: 'younger sister', em: '👶' },
      { zh: '爺爺', py: 'yé ye', zy: 'ㄧㄝˊ ˙ㄧㄝ', en: 'grandpa', em: '👴' },
      { zh: '奶奶', py: 'nǎi nai', zy: 'ㄋㄞˇ ˙ㄋㄞ', en: 'grandma', em: '👵' },
      { zh: '家人', py: 'jiā rén', zy: 'ㄐㄧㄚ ㄖㄣˊ', en: 'family', em: '👨‍👩‍👧‍👦' },
      { zh: '朋友', py: 'péng yǒu', zy: 'ㄆㄥˊ ˙ㄧㄡˇ', en: 'friend', em: '🧑‍🤝‍🧑' }
    ]
  },
  {
    id: 'greetings', zh: '問候', en: 'Greetings', emoji: '👋', color: '#0ca678',
    words: [
      { zh: '你好', py: 'nǐ hǎo', zy: 'ㄋㄧˇ ㄏㄠˇ', en: 'hello', em: '👋' },
      { zh: '謝謝', py: 'xiè xie', zy: 'ㄒㄧㄝˋ ˙ㄒㄧㄝ', en: 'thank you', em: '🙏' },
      { zh: '再見', py: 'zài jiàn', zy: 'ㄗㄞˋ ㄐㄧㄢˋ', en: 'goodbye', em: '🙋' },
      { zh: '早安', py: 'zǎo ān', zy: 'ㄗㄠˇ ㄢ', en: 'good morning', em: '🌅' },
      { zh: '晚安', py: 'wǎn ān', zy: 'ㄨㄢˇ ㄢ', en: 'good night', em: '🌜' },
      { zh: '請', py: 'qǐng', zy: 'ㄑㄧㄥˇ', en: 'please', em: '🙇', mn: 'Speech 言 + 青: speak politely — please!' },
      { zh: '對不起', py: 'duì bu qǐ', zy: 'ㄉㄨㄟˋ ˙ㄅㄨ ㄑㄧˇ', en: 'sorry', em: '😔' },
      { zh: '生日快樂', py: 'shēng rì kuài lè', zy: 'ㄕㄥ ㄖˋ ㄎㄨㄞˋ ㄌㄜˋ', en: 'happy birthday', em: '🎂' },
      { zh: '我愛你', py: 'wǒ ài nǐ', zy: 'ㄨㄛˇ ㄞˋ ㄋㄧˇ', en: 'I love you', em: '💖' },
      { zh: '加油', py: 'jiā yóu', zy: 'ㄐㄧㄚ ㄧㄡˊ', en: 'go for it!', em: '💪' }
    ]
  }
];

/* ---------------------------------------------------------------- games --- */
const GAMES = [
  { id: 'review',  zh: '每日複習', en: 'Daily Review',  emoji: '🎯', color: '#7c5cff',
    how: 'A smart mix of the words you most need to practise today.',
    howZh: '為你挑選今天最需要複習的字詞' },
  { id: 'match',   zh: '配對樂',   en: 'Memory Match',  emoji: '🃏', color: '#ff7a59',
    how: 'Flip two cards and find the character that matches the picture.',
    howZh: '翻牌找出漢字和圖片的一對' },
  { id: 'listen',  zh: '聽力王',   en: 'Listen Up',     emoji: '👂', color: '#4c8dff',
    how: 'Listen to the word, then tap the matching character.',
    howZh: '聽發音，選出正確的漢字' },
  { id: 'pinyin',  zh: '拼音高手', en: 'Pinyin Pop',    emoji: '🔤', color: '#12b886',
    how: 'Read the character and choose the correct pinyin.',
    howZh: '看漢字，選出正確的拼音' },
  { id: 'meaning', zh: '看圖選字', en: 'Picture Pick',  emoji: '🖼️', color: '#f59f00',
    how: 'See the picture and choose the matching character.',
    howZh: '看圖片，選出對應的漢字' },
  { id: 'build',   zh: '拼字高手', en: 'Word Builder',  emoji: '🧩', color: '#9b5de5',
    how: 'Tap the characters in the right order to build the word.',
    howZh: '按順序排出正確的字詞' },
  { id: 'boss',    zh: '挑戰王',   en: 'Boss Rush',     emoji: '🚀', color: '#ef476f',
    how: 'Answer fast! Beat the clock and keep your combo alive.',
    howZh: '快問快答，挑戰最高分' },
  { id: 'battle',  zh: '龍之對戰', en: 'Dragon Battle', emoji: '⚔️', color: '#e63946',
    how: 'Race your rival to the answer and knock down their dragon!',
    howZh: '和對手比賽搶答，打倒對方的龍' }
];

/* ------------------------------------------------ four language strands --- */
/* The whole syllabus is organised around the four aspects of language, in the
   Montessori order: spoken language first, then writing (encoding), then
   reading (decoding). Every activity in the app belongs to one strand. */
const STRANDS = [
  { id: 'listen', zh: '聽', en: 'Listening', emoji: '👂', color: '#4c8dff',
    how: 'Sound games and the second period of a lesson: show me…',
    howZh: '聽音遊戲與三階段教學的辨認階段' },
  { id: 'speak', zh: '說', en: 'Speaking', emoji: '🗣️', color: '#12b886',
    how: 'Spoken language comes first — name it out loud, then recall it.',
    howZh: '先說再讀：說出名字，再自己回想' },
  { id: 'read', zh: '讀', en: 'Reading', emoji: '📖', color: '#f59f00',
    how: 'The child decodes real sentences built from words they know.',
    howZh: '用學過的字讀出完整的句子' },
  { id: 'write', zh: '寫', en: 'Writing', emoji: '✍️', color: '#9b5de5',
    how: 'Sandpaper letters: trace the character, then build words from it.',
    howZh: '描寫字形，再用字卡拼出詞語' }
];

/* ------------------------------------------------------------- pet / xp --- */
const PET_STAGES = [
  { name: '龍蛋',     en: 'Dragon Egg',   emoji: '🥚', xp: 0 },
  { name: '小龍寶寶', en: 'Hatchling',    emoji: '🐣', xp: 120 },
  { name: '小龍',     en: 'Little Dragon', emoji: '🐥', xp: 350 },
  { name: '長尾龍',   en: 'Long-tail',    emoji: '🦕', xp: 750 },
  { name: '火龍',     en: 'Fire Dragon',  emoji: '🐲', xp: 1400 },
  { name: '龍王',     en: 'Dragon King',  emoji: '🐉', xp: 2400 }
];

const SHOP = [
  { id: 'bow',     zh: '蝴蝶結', en: 'Bow',        emoji: '🎀', price: 30 },
  { id: 'scarf',   zh: '圍巾',   en: 'Scarf',      emoji: '🧣', price: 35 },
  { id: 'hat',     zh: '派對帽', en: 'Party Hat',  emoji: '🎩', price: 50 },
  { id: 'glasses', zh: '墨鏡',   en: 'Sunglasses', emoji: '🕶️', price: 60 },
  { id: 'crown',   zh: '皇冠',   en: 'Crown',      emoji: '👑', price: 90 },
  { id: 'wand',    zh: '魔法棒', en: 'Magic Wand', emoji: '🪄', price: 120 },
  { id: 'medal',   zh: '金牌',   en: 'Gold Medal', emoji: '🏅', price: 150 },
  { id: 'rocket',  zh: '火箭',   en: 'Rocket',     emoji: '🚀', price: 200 }
];

const BADGES = [
  { id: 'first_game',  zh: '第一次冒險', en: 'First Quest',    emoji: '🌟', hint: 'Finish your first game' },
  { id: 'perfect',     zh: '完美一輪',   en: 'Perfect Round',  emoji: '💯', hint: 'Get every answer right in one round' },
  { id: 'combo10',     zh: '連擊高手',   en: 'Combo x10',      emoji: '🔥', hint: 'Answer 10 in a row correctly' },
  { id: 'words30',     zh: '識字小將',   en: '30 Words',       emoji: '📖', hint: 'Practise 30 different words' },
  { id: 'words60',     zh: '識字達人',   en: '60 Words',       emoji: '📚', hint: 'Practise 60 different words' },
  { id: 'words100',    zh: '識字大師',   en: '100 Words',      emoji: '🏆', hint: 'Practise 100 different words' },
  { id: 'streak3',     zh: '三天不間斷', en: '3-Day Streak',   emoji: '📅', hint: 'Play 3 days in a row' },
  { id: 'streak7',     zh: '一週不間斷', en: '7-Day Streak',   emoji: '🗓️', hint: 'Play 7 days in a row' },
  { id: 'games10',     zh: '十戰勇士',   en: '10 Games',       emoji: '🎮', hint: 'Finish 10 games' },
  { id: 'boss_clear',  zh: '挑戰王',     en: 'Boss Slayer',    emoji: '🚀', hint: 'Clear a Boss Rush round' },
  { id: 'duel_first',  zh: '初次對戰',   en: 'First Duel',     emoji: '⚔️', hint: 'Finish a Dragon Battle' },
  { id: 'duel_win',    zh: '不敗傳說',   en: 'Duel Champion',  emoji: '🐉', hint: 'Win a Dragon Battle' },
  { id: 'coins500',    zh: '小富翁',     en: 'Coin Keeper',    emoji: '🪙', hint: 'Collect 500 coins' },
  { id: 'evolve',      zh: '進化時刻',   en: 'Evolution',      emoji: '✨', hint: 'Evolve your dragon once' },
  { id: 'exam_perfect', zh: '四項滿分',  en: 'Four-Skill Star', emoji: '🌟', hint: 'Full marks in all four skills on the daily check' },
  { id: 'reader4',     zh: '故事小讀者', en: 'Story Reader',   emoji: '📖', hint: 'Finish four stories' },
  { id: 'writer10',    zh: '小小書法家', en: 'Little Writer',  emoji: '✍️', hint: 'Trace ten characters' },
  { id: 'speaker20',   zh: '愛說話',     en: 'Confident Speaker', emoji: '🗣️', hint: 'Say twenty words out loud' }
];

const CONFIG = {
  storageKey: 'chineseQuest.v2',
  dailyGoalXp: 60,
  questionsPerRound: 10,
  matchPairs: 6,
  bossSeconds: 60,
  bossLives: 3,
  xpPerCorrect: 10,
  coinsPerCorrect: 2,
  comboBonusEvery: 3,
  difficulty: {
    easy:   { name: '簡單', en: 'Easy',   options: 3, matchPairs: 4, secPerQ: 0,  aiSpeed: [3400, 5200] },
    normal: { name: '普通', en: 'Normal', options: 4, matchPairs: 6, secPerQ: 12, aiSpeed: [2600, 4200] },
    hard:   { name: '困難', en: 'Hard',   options: 6, matchPairs: 8, secPerQ: 8,  aiSpeed: [1800, 3200] }
  },
  srsIntervals: [0, 10 * 60e3, 24 * 3600e3, 3 * 24 * 3600e3, 7 * 24 * 3600e3, 21 * 24 * 3600e3],
  battleHp: 100,
  battleDamage: [14, 20, 28],
  examPerStrand: 3,               // items per strand in the daily four-skill check
  dailyLevelLimit: 3,             // adventure levels a child may clear per day
  levelLimitOptions: [1, 3, 5, 0],// 0 = no limit
  traceCells: 24,                 // tracing grid resolution (control of error)
  tracePass: 55,                  // % of the strokes covered before it counts
  accentAvatars: ['🐉', '🐼', '🦊', '🐯', '🐰', '🐨', '🦄', '🐸', '🐙', '🦖']
};

/* --------------------------------------------------------------- levels --- */
/* A 40-level adventure ladder. Each theme contributes three skill levels
   (getting longer as you climb) and a boss level. Clearing a level with at
   least one star unlocks the next one. */
const LEVEL_SKILLS = ['meaning', 'listen', 'pinyin'];

const LEVELS = (function () {
  var out = [];
  THEMES.forEach(function (t, ti) {
    var counts = [6, 8, 10];
    LEVEL_SKILLS.forEach(function (kind, ki) {
      out.push({
        n: out.length + 1,
        theme: t.id, themeZh: t.zh, themeEn: t.en, emoji: t.emoji, color: t.color,
        kind: kind, boss: false, count: counts[ki],
        tier: ti < 4 ? 'easy' : (ti < 7 ? 'normal' : 'hard')
      });
    });
    out.push({
      n: out.length + 1,
      theme: t.id, themeZh: t.zh, themeEn: t.en, emoji: t.emoji, color: t.color,
      kind: ti % 2 === 0 ? 'battle' : 'boss',      // alternate duel / boss rush
      boss: true, count: 12,
      tier: ti < 4 ? 'easy' : (ti < 7 ? 'normal' : 'hard')
    });
  });
  return out;
})();

/* ----------------------------------------------------------- ranking ------ */
const RANK = { posterW: 1080, posterH: 1350, medals: ['🥇', '🥈', '🥉'] };

/* Flat lookup + a few derived helpers used across the app. */
const ALL_WORDS = THEMES.flatMap(function (t) {
  return t.words.map(function (w) {
    return Object.assign({}, w, { theme: t.id, themeZh: t.zh, themeEn: t.en, color: t.color });
  });
});

const WORD_BY_ZH = {};
ALL_WORDS.forEach(function (w) { WORD_BY_ZH[w.zh] = w; });

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { THEMES: THEMES, GAMES: GAMES, PET_STAGES: PET_STAGES, SHOP: SHOP, BADGES: BADGES, CONFIG: CONFIG, ALL_WORDS: ALL_WORDS, WORD_BY_ZH: WORD_BY_ZH, LEVELS: LEVELS, RANK: RANK, STRANDS: STRANDS };
}
