/* =========================================================================
   龍之華語 Chinese Quest — 讀本 Reading library
   每日故事 Daily stories for the reading strand.

   Montessori notes
   • Each story is a controlled-vocabulary reader: every sentence is built from
     the 109-word picture bank plus the sight words below, so decoding is a real
     act of reading rather than guessing ("isolation of difficulty").
   • Stories run to about 100 characters, one idea per sentence, with the
     repetition early readers rely on.
   • The glossary carries the function words a reader needs long before they can
     name them (我 是 的 了 在 …) — spoken language comes first, and now the child
     meets it in print.
   ========================================================================= */

var STORIES = [
  {
    id: 'kitten', level: 1, theme: 'animals', emoji: '🐱',
    title: '小貓', titleEn: 'The Kitten',
    lines: [
      ['我是小貓。', 'I am a kitten.'],
      ['我的名字叫小花。', 'My name is Little Flower.'],
      ['我喜歡魚和牛奶。', 'I like fish and milk.'],
      ['今天天氣很好。', 'The weather is nice today.'],
      ['我在花園裡玩球。', 'I play with a ball in the garden.'],
      ['我看到一隻鳥。', 'I see a bird.'],
      ['鳥在樹上唱歌。', 'The bird sings in the tree.'],
      ['小鳥是我的好朋友。', 'The bird is my good friend.'],
      ['我們一起唱歌。', 'We sing together.'],
      ['我很開心。', 'I am very happy.'],
      ['白天，蝴蝶在花園裡飛。', 'In the daytime, butterflies fly in the garden.'],
      ['晚上，我在花園裡睡覺。', 'At night, I sleep in the garden.'],
      ['媽媽說我很可愛。', 'Mum says I am very cute.'],
      ['我的家很漂亮。', 'My home is very pretty.'],
      ['歡迎來我家玩。', 'Welcome to my home to play.']
    ],
    questions: [
      { q: '小貓的名字是什麼？', en: 'What is the kitten called?', options: ['小花', '小白', '小鳥'], answer: 0 },
      { q: '小貓喜歡吃什麼？', en: 'What does the kitten like?', options: ['魚和牛奶', '花和樹', '米飯'], answer: 0 },
      { q: '小貓晚上在哪裡睡覺？', en: 'Where does the kitten sleep at night?', options: ['樹上', '花園裡', '學校'], answer: 1 }
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
      ['我們一起去公園。', 'We go to the park together.'],
      ['公園裡有很多花。', 'There are lots of flowers in the park.'],
      ['我們看到紅色的花，', 'We see red flowers,'],
      ['也看到黃色的花。', 'and we see yellow flowers too.'],
      ['媽媽說天氣真好。', 'Mum says the weather is lovely.'],
      ['我們一起玩球。', 'We play ball together.'],
      ['我們很快樂。', 'We are very happy.'],
      ['晚上，我們一起吃飯。', 'In the evening we eat together.'],
      ['我很愛我的家人。', 'I love my family very much.']
    ],
    questions: [
      { q: '我家有幾個人？', en: 'How many people are in my family?', options: ['三個', '四個', '五個'], answer: 1 },
      { q: '誰喜歡看書？', en: 'Who likes reading?', options: ['爸爸', '媽媽', '姐姐'], answer: 2 },
      { q: '我們在公園裡做什麼？', en: 'What do we do in the park?', options: ['玩球', '看書', '做飯'], answer: 0 }
    ]
  },
  {
    id: 'puppy', level: 1, theme: 'animals', emoji: '🐶',
    title: '小狗', titleEn: 'The Puppy',
    lines: [
      ['小狗很可愛。', 'The puppy is very cute.'],
      ['牠的名字叫小白。', 'Its name is Xiaobai.'],
      ['牠喜歡跑，', 'It likes to run,'],
      ['也喜歡玩球。', 'and it likes to play with a ball too.'],
      ['下午我和牠去公園。', 'In the afternoon my dog and I go to the park.'],
      ['公園很大。', 'The park is very big.'],
      ['我們一起跑步。', 'We run together.'],
      ['我們看到很多鳥。', 'We see lots of birds.'],
      ['小白喜歡看鳥。', 'Xiaobai likes watching the birds.'],
      ['牠不喜歡下雨天。', 'It does not like rainy days.'],
      ['下雨天我們在家裡玩。', 'On rainy days we play at home.'],
      ['晚上，小白在我旁邊睡覺。', 'At night Xiaobai sleeps beside me.'],
      ['我很喜歡小白。', 'I really like Xiaobai.'],
      ['牠是我最好的朋友。', 'It is my best friend.']
    ],
    questions: [
      { q: '小狗的名字是什麼？', en: 'What is the puppy called?', options: ['小花', '小白', '小鳥'], answer: 1 },
      { q: '小狗不喜歡什麼？', en: 'What does the puppy not like?', options: ['跑步', '玩球', '下雨天'], answer: 2 },
      { q: '晚上小狗在哪裡睡覺？', en: 'Where does the puppy sleep at night?', options: ['在公園', '在我旁邊', '在學校'], answer: 1 }
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
      ['有紅色的花，', 'There are red flowers,'],
      ['也有黃色的花。', 'and yellow flowers too.'],
      ['蝴蝶在飛。', 'Butterflies are flying.'],
      ['山上有大樹。', 'There are big trees on the mountain.'],
      ['我們在大樹下面吃午餐。', 'We eat lunch under a big tree.'],
      ['小鳥在樹上唱歌。', 'The birds sing in the trees.'],
      ['我們一起唱歌。', 'We sing together.'],
      ['我們很快樂。', 'We are very happy.'],
      ['下午我們回家。', 'In the afternoon we go home.'],
      ['這一天真好。', 'What a lovely day.'],
      ['我和朋友都很開心。', 'My friend and I are both very happy.']
    ],
    questions: [
      { q: '天上的雲是什麼顏色？', en: 'What colour are the clouds?', options: ['紅色', '白色', '黃色'], answer: 1 },
      { q: '我和誰去山上？', en: 'Who goes to the mountain with me?', options: ['朋友', '姐姐', '老師'], answer: 0 },
      { q: '我們在哪裡吃午餐？', en: 'Where do we eat lunch?', options: ['學校', '大樹下面', '家裡'], answer: 1 }
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
      ['我很喜歡香蕉。', 'I really like bananas.'],
      ['我也喜歡喝牛奶。', 'I like drinking milk too.'],
      ['吃飽了，我很開心。', 'I am full, and very happy.'],
      ['今天天氣很冷，', 'It is very cold today,'],
      ['我喝熱茶。', 'so I drink hot tea.'],
      ['中午我在學校吃飯。', 'At midday I eat at school.'],
      ['晚上，媽媽做飯。', 'In the evening Mum cooks.'],
      ['我們一起吃晚飯。', 'We eat dinner together.'],
      ['我們一起吃早餐。', 'We eat breakfast together.']
    ],
    questions: [
      { q: '我喝什麼？', en: 'What do I drink?', options: ['牛奶', '蛋糕', '茶'], answer: 0 },
      { q: '爸爸喝什麼？', en: 'What does Dad drink?', options: ['牛奶', '茶', '果汁'], answer: 1 },
      { q: '今天天氣怎麼樣？', en: 'What is the weather like today?', options: ['很熱', '很冷', '下雨'], answer: 1 }
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
      ['下課了，', 'Class is over,'],
      ['我們去外面玩。', 'and we go outside to play.'],
      ['今天我學了三個新的字。', 'Today I learned three new characters.'],
      ['老師教我們寫花和樹。', 'The teacher taught us to write 花 and 樹.'],
      ['老師說我的字很美。', 'The teacher says my characters are beautiful.'],
      ['我在教室裡讀了一本書。', 'I read a book in the classroom.'],
      ['書裡有很多好故事。', 'There are many good stories in the book.'],
      ['我喜歡我的學校。', 'I like my school.'],
      ['明天我還要來學校。', 'Tomorrow I will come to school again.']
    ],
    questions: [
      { q: '我喜歡什麼？', en: 'What do I like?', options: ['畫畫', '唱歌', '跑步'], answer: 0 },
      { q: '今天我學了幾個新字？', en: 'How many new characters did I learn today?', options: ['兩個', '三個', '四個'], answer: 1 },
      { q: '老師教我們寫什麼？', en: 'What did the teacher teach us to write?', options: ['花和樹', '書和筆', '貓和狗'], answer: 0 }
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
      ['雨停了，', 'The rain stops,'],
      ['太陽出來了。', 'and the sun comes out.'],
      ['我們看到彩虹。', 'We see a rainbow.'],
      ['彩虹有紅色、黃色、', 'The rainbow has red, yellow,'],
      ['綠色和藍色。', 'green and blue.'],
      ['雨後的花很漂亮。', 'The flowers after the rain are beautiful.'],
      ['小鳥也出來唱歌。', 'The birds come out to sing too.'],
      ['我和小狗在花園裡玩。', 'My dog and I play in the garden.'],
      ['地上有水。', 'There is water on the ground.'],
      ['我們很開心。', 'We are very happy.'],
      ['我喜歡下雨天。', 'I like rainy days.']
    ],
    questions: [
      { q: '下雨天我在家裡做什麼？', en: 'What do I do at home on a rainy day?', options: ['看書', '做飯', '玩球'], answer: 0 },
      { q: '雨停了，我們看到什麼？', en: 'What do we see when the rain stops?', options: ['星星', '彩虹', '雪'], answer: 1 },
      { q: '彩虹有什麼顏色？', en: 'What colours does the rainbow have?', options: ['紅色和黃色', '紅色、黃色、綠色和藍色', '黑色和白色'], answer: 1 }
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
      ['我們一起吃蛋糕，', 'We eat cake together,'],
      ['一起唱歌。', 'and sing together.'],
      ['我很快樂。', 'I am very happy.'],
      ['謝謝大家！', 'Thank you everyone!'],
      ['爸爸送我一本書，', 'Dad gave me a book,'],
      ['書裡有很多故事。', 'and there are many stories in it.'],
      ['姐姐送我筆和尺。', 'My sister gave me a pen and a ruler.'],
      ['蛋糕很好吃。', 'The cake is delicious.'],
      ['我很開心。', 'I am very happy.'],
      ['晚上，我們一起吃晚飯。', 'In the evening we eat dinner together.'],
      ['我愛我的家人。', 'I love my family.']
    ],
    questions: [
      { q: '我幾歲？', en: 'How old am I?', options: ['七歲', '八歲', '九歲'], answer: 1 },
      { q: '媽媽做了什麼？', en: 'What did Mum make?', options: ['蛋糕', '米飯', '麵包'], answer: 0 },
      { q: '爸爸送我什麼？', en: 'What did Dad give me?', options: ['一本書', '一支筆', '一個蛋糕'], answer: 0 }
    ]
  }
];

/* 常用字 the function and sight words a beginning reader meets in print.
   Kept out of the 109-word picture bank because these are learned in context,
   not from a picture card. */
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
  '什': ['shén', 'what'],       '麼': ['me', '(as in 什麼 = what)'], '誰': ['shéi', 'who'],
  '哪': ['nǎ', 'which, where'], '幾': ['jǐ', 'how many'],     '三': ['sān', 'three'],
  '四': ['sì', 'four'],         '五': ['wǔ', 'five'],         '七': ['qī', 'seven'],
  '八': ['bā', 'eight'],        '九': ['jiǔ', 'nine'],        '兩': ['liǎng', 'two (with a measure word)'],
  '花': ['huā', 'flower'],      '毛': ['máo', 'hair, fur'],
  /* added for the ~100-character daily stories */
  '名': ['míng', 'name'],       '叫': ['jiào', 'to be called'], '晚': ['wǎn', 'evening, late'],
  '漂': ['piào', 'pretty (in 漂亮)'], '睡': ['shuì', 'to sleep'], '覺': ['jiào', 'sleep (睡覺)'],
  '迎': ['yíng', 'to welcome'], '旁': ['páng', 'beside'],     '邊': ['biān', 'side'],
  '最': ['zuì', 'most'],        '回': ['huí', 'to return'],   '這': ['zhè', 'this'],
  '冷': ['lěng', 'cold'],       '熱': ['rè', 'hot'],          '美': ['měi', 'beautiful'],
  '室': ['shì', 'room'],        '故': ['gù', 'old, story'],   '事': ['shì', 'matter, story'],
  '綠': ['lǜ', 'green'],        '藍': ['lán', 'blue'],        '後': ['hòu', 'after, behind'],
  '地': ['dì', 'ground, place'],'本': ['běn', '(for books)'],  '甜': ['tián', 'sweet'],
  '亮': ['liàng', 'bright (漂亮 = pretty)'], '真': ['zhēn', 'really, true'],
  '怎': ['zěn', '(怎麼 = how)'], '樣': ['yàng', '(怎麼樣 = how)'],
  '教': ['jiāo', 'to teach'],   '明': ['míng', 'bright (明天 = tomorrow)'],
  '還': ['hái', 'still, also'], '要': ['yào', 'to want, will'],
  '黑': ['hēi', 'black'],       '支': ['zhī', '(for pens, sticks)']
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
var STORY_PUNCT = /[。，、！？；：]/;

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
    s.text.split('').forEach(function (c) { if (!STORY_PUNCT.test(c) && !/\s/.test(c)) set[c] = 1; });
    s.questions.forEach(function (q) {
      (q.q + q.options.join('')).split('').forEach(function (c) {
        if (!STORY_PUNCT.test(c) && !/\s/.test(c)) set[c] = 1;
      });
    });
  });
  return Object.keys(set);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { STORIES: STORIES, STORY_WORDS: STORY_WORDS, CHAR_PY: CHAR_PY, STORY_BY_ID: STORY_BY_ID };
}
