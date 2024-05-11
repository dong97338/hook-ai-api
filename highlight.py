from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
import time

chrome_options = Options()
chrome_options.add_argument('--ignore-certificate-errors')
chrome_options.add_argument('--disable-gpu')  # GPU 가속 비활성화
chrome_options.add_argument('--no-sandbox')  # 샌드박스 모드 비활성화
chrome_options.add_argument('--disable-dev-shm-usage')  # /dev/shm 파티션 사용 안함
chrome_options.add_argument('--enable-logging')  # 로깅 활성화
chrome_options.add_argument('--v=1')  # 로깅 수준 설정
chrome_options.add_argument(r'--log-path=C:\\chromedriver.log')  # raw string 사용

chrome_options.page_load_strategy = 'eager'  # 'normal', 'eager', 'none'

service = Service(ChromeDriverManager().install())
driver = webdriver.Chrome(service=service, options=chrome_options)

chunks = ["Duolingo Max는 Super Duolingo의 업그레이드 버전으로, Duolingo 유저들이 서비스를 이용하며 느꼈던 아쉬운 점들을 보완하여 출시한 서비스입니다.", 
          "사용자가 GPT-4 모델을 기반으로 한 페르소나와 특정한 주제/테스크에 맞추어 자유롭게 대화하며 언어를 학습할 수 있는 새로운 기능입니다.", 
          "세 번째 텍스트 청크"]

def highlight_text(driver, text):
    script = """
    var bodyText = document.body.innerHTML;
    var re = new RegExp('(%s)', 'gi');
    bodyText = bodyText.replace(re, '<span style="background-color: yellow;">$1</span>');
    document.body.innerHTML = bodyText;
    """ % text
    driver.execute_script(script)

url = "https://community.kairosku.com/c/ai-ux-research/duolingo-ai"
driver.get(url)
time.sleep(3)

for chunk in chunks:
    highlight_text(driver, chunk)

# 스크립트 실행이 완료된 후에는 driver를 명시적으로 닫아줘야 합니다.
driver.quit()
