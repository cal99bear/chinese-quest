/* =========================================================================
   龍之華語 Chinese Quest — 讀本 Reading library
   短篇故事 Short stories for the reading strand.

   Montessori notes:
   • Every story is a controlled-vocabulary reader built almost entirely from
     words the child has already met in the 109-word bank, so decoding is a
     real act of reading rather than guessing ("isolation of difficulty").
   • Each story is well under 100 characters, one idea per sentence.
   • The glossary below carries the function words a reader needs long before
     they can name them (我 是 的 了 在 …) — Montessori's "spoken language
     comes first": the child already says these, now they meet them in print.
   ========================================================================= */

var STORIES = [
  {
    id: 'kitten', level: 1, theme: 'animals', emoji: '🐱',
    title: '小貓', titleEn: 'The Kitten',
    lines: [
      ['我是小貓。', 'I am a kitten.'],
      ['我喜歡魚。', 'I like fish.'],
      ['今天天氣很好。', 'The weather is nice today.'],
      ['我在花園裡玩。', 'I play in the garden.'],
      ['我看到一隻鳥。', 'I see a bird.'],
      ['鳥在樹上唱歌。', 'The bird sings in the tree.'],
      ['我很開心。', 'I am very happy.']
    ],
    questions: [
      { q: '小貓喜歡什麼？', en: 'What does the kitten like?', options: ['魚', '花', '雲'], answer: 0 },
      { q: '鳥在哪裡唱歌？', en: 'Where does the bird sing?', options: ['學校', '樹上', '山上'], answer: 1 }
    ]
  },
  {
    id: 'family', level: 1, theme: 'family', emoji: '👨‍👩‍👧',
    title: '我的家人', titleEn: 'My Family',
    lines: [
      ['我家有四個人。', 'There are four people in my family.'],
      ['爸爸、媽媽、姐姐和我。', 'Dad, Mum, my big sister and me.'],
      ['爸爸喜歡喝茶。', 'Dad likes drinking tea.'],
      ['媽媽喜歡花。', 'Mum likes flowers.'],
      ['姐姐喜歡看書。', 'My sister likes reading.'],
      ['我喜歡唱歌。', 'I like singing.'],
      ['我們一起去公園。', 'We go to the park together.']
    ],
    questions: [
      { q: '我家有幾個人？', en: 'How many people are in my family?', options: ['三個', '四個', '五個'], answer: 1 },
      { q: '爸爸喜歡什麼？', en: 'What does Dad like?', options: ['喝茶', '看書', '唱歌'], answer: 0 }
    ]
  },
  {
    id: 'sunnyday', level: 2, theme: 'nature', emoji: '☀️',
    title: '好天氣', titleEn: 'A Beautiful Day',
    lines: [
      ['今天太陽很大。', 'The sun is strong today.'],
      ['天上的雲很白。', 'The clouds in the sky are white.'],
      ['我和朋友去山上。', 'My friend and I go to the mountain.'],
      ['我們看到很多花。', 'We see lots of flowers.'],
      ['有紅色的花，也有黃色的花。', 'There are red flowers and yellow flowers.'],
      ['蝴蝶在飛。', 'Butterflies are flying.'],
      ['我們很快樂。', 'We are very happy.']
    ],
    questions: [
      { q: '雲是什麼顏色？', en: 'What colour are the clouds?', options: ['紅色', '白色', '黃色'], answer: 1 },
      { q: '我和誰去山上？', en: 'Who goes to the mountain with me?', options: ['朋友', '姐姐', '老師'], answer: 0 }
    ]
  },
  {
    id: 'breakfast', level: 2, theme: 'food', emoji: '🍞',
    title: '早餐', titleEn: 'Breakfast',
    lines: [
      ['早上我吃麵包和蛋。', 'In the morning I eat bread and an egg.'],
      ['我喝牛奶。', 'I drink milk.'],
      ['媽媽吃米飯。', 'Mum eats rice.'],
      ['爸爸喝茶。', 'Dad drinks tea.'],
      ['我們都吃水果。', 'We all eat fruit.'],
      ['蘋果和香蕉很好吃。', 'Apples and bananas are delicious.'],
      ['吃飽了，我很開心。', 'I am full, and very happy.']
    ],
    questions: [
      { q: '我喝什麼？', en: 'What do I drink?', options: ['牛奶', '蛋糕', '茶'], answer: 0 },
      { q: '爸爸喝什麼？', en: 'What does Dad drink?', options: ['牛奶', '茶', '果汁'], answer: 1 }
    ]
  },
  {
    id: 'puppy', level: 1, theme: 'animals', emoji: '🐶',
    title: '小狗', titleEn: 'The Puppy',
    lines: [
      ['小狗很可愛。', 'The puppy is very cute.'],
      ['牠喜歡跑。', 'It likes to run.'],
      ['牠喜歡玩球。', 'It likes to play with a ball.'],
      ['下午我和牠去公園。', 'In the afternoon my dog and I go to the park.'],
      ['公園很大。', 'The park is very big.'],
      ['我很喜歡小白。', 'I really like Xiaobai.']
    ],
    questions: [
      { q: '小狗喜歡玩什麼？', en: 'What does the puppy like to play with?', options: ['球', '書', '花'], answer: 0 },
      { q: '我們去哪裡？', en: 'Where do we go?', options: ['學校', '公園', '山上'], answer: 1 }
    ]
  },
  {
    id: 'school', level: 2, theme: 'school', emoji: '🏫',
    title: '在學校', titleEn: 'At School',
    lines: [
      ['我在學校有很多同學。', 'I have many classmates at school.'],
      ['老師很好。', 'My teacher is very good.'],
      ['我們一起讀書和寫字。', 'We read and write together.'],
      ['我喜歡畫畫。', 'I like drawing.'],
      ['下課了，我們去外面玩。', 'Class is over, we go outside to play.'],
      ['今天我學了三個新的字。', 'Today I learned three new characters.']
    ],
    questions: [
      { q: '我喜歡什麼？', en: 'What do I like?', options: ['畫畫', '唱歌', '跑步'], answer: 0 },
      { q: '今天學了幾個字？', en: 'How many characters did I learn today?', options: ['兩個', '三個', '四個'], answer: 1 }
    ]
  },
  {
    id: 'rainyday', level: 3, theme: 'nature', emoji: '🌧️',
    title: '下雨天', titleEn: 'A Rainy Day',
    lines: [
      ['今天下雨了。', 'It is raining today.'],
      ['天上有雲。', 'There are clouds in the sky.'],
      ['我們不能去外面。', 'We cannot go outside.'],
      ['我在家裡看書。', 'I read at home.'],
      ['媽媽在廚房做飯。', 'Mum cooks in the kitchen.'],
      ['雨停了，太陽出來了。', 'The rain stops and the sun comes out.'],
      ['我們看到彩虹。', 'We see a rainbow.']
    ],
    questions: [
      { q: '我在家裡做什麼？', en: 'What do I do at home?', options: ['看書', '做飯', '玩球'], answer: 0 },
      { q: '雨停了，我們看到什麼？', en: 'What do we see when the rain stops?', options: ['星星', '彩虹', '雪'], answer: 1 }
    ]
  },
  {
    id: 'birthday', level: 3, theme: 'greetings', emoji: '🎂',
    title: '我的生日', titleEn: 'My Birthday',
    lines: [
      ['今天是我的生日。', 'Today is my birthday.'],
      ['我八歲了。', 'I am eight years old.'],
      ['媽媽做了一個蛋糕。', 'Mum made a cake.'],
      ['朋友送我一份禮物。', 'My friend gave me a present.'],
      ['我們一起吃蛋糕，一起唱歌。', 'We eat cake and sing together.'],
      ['我很快樂。謝謝大家！', 'I am very happy. Thank you everyone!']
    ],
    questions: [
      { q: '我幾歲？', en: 'How old am I?', options: ['七歲', '八歲', '九歲'], answer: 1 },
      { q: '媽媽做了什麼？', en: 'What did Mum make?', options: ['蛋糕', '米飯', '麵包'], answer: 0 }
    ]
  }
];

/* 常用字 the function words a beginning reader meets in print.
   Kept separate from the 109-word picture bank because these are learned by
   sight and in context, not from a picture card. */
var STORY_WORDS = {
  '我': ['wǒ', 'I, me'],        '你': ['nǐ', 'you'],          '他': ['tā', 'he, him'],
  '她': ['tā', 'she, her'],     '牠': ['tā', 'it (an animal)'],'們': ['men', '(plural)'],
  '的': ['de', "(possessive)"], '了': ['le', '(completed)'],   '在': ['zài', 'at, in, is'],
  '是': ['shì', 'to be'],       '有': ['yǒu', 'to have'],     '也': ['yě', 'also'],
  '和': ['hé', 'and, with'],    '不': ['bù', 'not'],          '很': ['hěn', 'very'],
  '都': ['dōu', 'all, both'],   '去': ['qù', 'to go'],        '來': ['lái', 'to come'],
  '個': ['gè', '(measure word)'],'太': ['tài', 'too, very'],  '好': ['hǎo', 'good'],
  '天': ['tiān', 'sky, day'],   '氣': ['qì', 'air, weather'], '今': ['jīn', 'today'],
  '早': ['zǎo', 'early'],       '上': ['shàng', 'up, on'],    '下': ['xià', 'down, under'],
  '中': ['zhōng', 'middle'],    '小': ['xiǎo', 'small'],      '大': ['dà', 'big'],
  '多': ['duō', 'many'],        '少': ['shǎo', 'few'],        '隻': ['zhī', '(for animals)'],
  '園': ['yuán', 'garden'],     '裡': ['lǐ', 'inside'],       '到': ['dào', 'to arrive'],
  '唱': ['chàng', 'to sing'],   '歌': ['gē', 'song'],         '開': ['kāi', 'to open (開心 = happy)'],
  '友': ['yǒu', 'friend'],      '朋': ['péng', 'friend'],     '字': ['zì', 'character'],
  '寫': ['xiě', 'to write'],    '畫': ['huà', 'to draw'],     '課': ['kè', 'lesson'],
  '外': ['wài', 'outside'],     '面': ['miàn', 'side, face'], '新': ['xīn', 'new'],
  '校': ['xiào', 'school'],     '學': ['xué', 'to learn'],    '生': ['shēng', 'student'],
  '師': ['shī', 'teacher'],     '老': ['lǎo', 'old'],         '同': ['tóng', 'same'],
  '喜': ['xǐ', 'to like'],      '歡': ['huān', 'glad'],       '跳': ['tiào', 'to jump'],
  '球': ['qiú', 'ball'],        '可': ['kě', 'can, -able'],   '愛': ['ài', 'to love'],
  '午': ['wǔ', 'noon'],         '公': ['gōng', 'public'],     '人': ['rén', 'person'],
  '爸': ['bà', 'dad'],          '媽': ['mā', 'mum'],          '姐': ['jiě', 'sister'],
  '起': ['qǐ', 'to rise, together'], '飯': ['fàn', 'rice, meal'],
  '蘋': ['píng', 'apple'],      '果': ['guǒ', 'fruit'],       '香': ['xiāng', 'fragrant'],
  '蕉': ['jiāo', 'banana'],     '飽': ['bǎo', 'full'],        '奶': ['nǎi', 'milk'],
  '米': ['mǐ', 'rice'],         '包': ['bāo', 'bun'],         '蝴': ['hú', 'butterfly'],
  '蝶': ['dié', 'butterfly'],   '飛': ['fēi', 'to fly'],      '紅': ['hóng', 'red'],
  '黃': ['huáng', 'yellow'],    '白': ['bái', 'white'],       '色': ['sè', 'colour'],
  '彩': ['cǎi', 'colour'],      '虹': ['hóng', 'rainbow'],    '快': ['kuài', 'fast, happy'],
  '樂': ['lè', 'happy'],        '陽': ['yáng', 'sun'],        '能': ['néng', 'can'],
  '廚': ['chú', 'kitchen'],     '房': ['fáng', 'room'],       '做': ['zuò', 'to do, make'],
  '停': ['tíng', 'to stop'],    '出': ['chū', 'to go out'],   '歲': ['suì', 'years old'],
  '送': ['sòng', 'to give'],    '份': ['fèn', 'a portion'],   '禮': ['lǐ', 'gift'],
  '物': ['wù', 'thing'],        '謝': ['xiè', 'thanks'],      '家': ['jiā', 'home, family'],
  '顏': ['yán', 'colour, face'],'餐': ['cān', 'meal'],        '汁': ['zhī', 'juice'],
  '步': ['bù', 'step'],         '星': ['xīng', 'star'],       '日': ['rì', 'sun, day'],
  '糕': ['gāo', 'cake'],
  '什': ['shén', 'what'],       '麼': ['me', '(as in 什麼 = what)'],         '誰': ['shéi', 'who'],
  '哪': ['nǎ', 'which, where'], '幾': ['jǐ', 'how many'],     '三': ['sān', 'three'],
  '四': ['sì', 'four'],         '五': ['wǔ', 'five'],         '七': ['qī', 'seven'],
  '八': ['bā', 'eight'],        '九': ['jiǔ', 'nine'],        '兩': ['liǎng', 'two (with a measure word)'],
  '花': ['huā', 'flower'],      '毛': ['máo', 'hair, fur']
};

/* one merged lookup for every character the child can meet in a story */
var CHAR_PY = (function () {
  /* in the browser data.js has already run; under node we require it */
  var bank = (typeof ALL_WORDS !== 'undefined') ? ALL_WORDS
    : (typeof require === 'function' ? require('./data.js').ALL_WORDS : []);
  var map = {};
  bank.forEach(function (w) {
    if (w.zh.length === 1 && !map[w.zh]) map[w.zh] = [w.py, w.en, w.em];
  });
  Object.keys(STORY_WORDS).forEach(function (c) {
    map[c] = [STORY_WORDS[c][0], STORY_WORDS[c][1], map[c] ? map[c][2] : ''];
  });
  return map;
})();

/* derived helpers ---------------------------------------------------------- */
STORIES.forEach(function (s) {
  s.text = s.lines.map(function (l) { return l[0]; }).join('');
  s.chars = s.text.replace(/[。，、！？；：]/g, '').length;
});

var STORY_BY_ID = {};
STORIES.forEach(function (s) { STORY_BY_ID[s.id] = s; });

/* every character used in the library, for the content validator */
function storyCharacters() {
  var set = {};
  STORIES.forEach(function (s) {
    s.text.split('').forEach(function (c) {
      if (!/[。，、！？；：\s]/.test(c)) set[c] = 1;
    });
    s.questions.forEach(function (q) {
      (q.q + q.options.join('')).split('').forEach(function (c) {
        if (!/[。，、！？；：\s]/.test(c)) set[c] = 1;
      });
    });
  });
  return Object.keys(set);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { STORIES: STORIES, STORY_WORDS: STORY_WORDS, CHAR_PY: CHAR_PY, STORY_BY_ID: STORY_BY_ID };
}
