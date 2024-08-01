import os
from konlpy.tag import Mecab

# 실제 경로 설정
real_dicpath = '/opt/homebrew/lib/mecab/dic/mecab-ko-dic'
os.environ['MECAB_KO_DIC_PATH'] = real_dicpath
print(f'Setting MECAB_KO_DIC_PATH to {real_dicpath}')

try:
    # Mecab 인스턴스 생성
    mecab = Mecab(dicpath=real_dicpath)
    print(f'Successfully initialized Mecab with dictionary path: {real_dicpath}')

    # 테스트 문장 분석
    test_sentence = '테스트 문장입니다'
    result = mecab.morphs(test_sentence)
    print(f'Morphs for "{test_sentence}": {result}')
except Exception as e:
    print(f'Failed to initialize Mecab with path {real_dicpath}: {e}')
