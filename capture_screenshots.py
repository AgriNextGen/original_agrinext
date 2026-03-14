import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def capture_screenshots():
    # Setup Chrome driver
    options = webdriver.ChromeOptions()
    options.add_argument('--start-maximized')
    options.add_argument('--window-size=1920,1080')
    
    driver = webdriver.Chrome(options=options)
    actions = ActionChains(driver)
    
    try:
        print("Step 1: Navigating to http://localhost:5173/")
        driver.get("http://localhost:5173/")
        
        print("Step 2: Waiting 3 seconds for full load")
        time.sleep(3)
        
        print("Step 3: Scrolling to Problem section")
        try:
            headings = driver.find_elements(By.TAG_NAME, "h2") + driver.find_elements(By.TAG_NAME, "h3")
            problem_heading = None
            for h in headings:
                if "problem" in h.text.lower() or "challenge" in h.text.lower():
                    problem_heading = h
                    break
            
            if problem_heading:
                driver.execute_script("arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});", problem_heading)
                time.sleep(1.5)
                driver.save_screenshot("screenshot-problem-section.png")
                print("  ✓ Saved screenshot-problem-section.png")
        except Exception as e:
            print(f"  ✗ Error: {e}")
        
        print("Step 4: Hovering over a problem card")
        try:
            cards = driver.find_elements(By.CSS_SELECTOR, ".group")
            if len(cards) > 0:
                actions.move_to_element(cards[0]).perform()
                time.sleep(0.5)
                driver.save_screenshot("screenshot-problem-card-hover.png")
                print("  ✓ Saved screenshot-problem-card-hover.png")
        except Exception as e:
            print(f"  ✗ Error: {e}")
        
        print("Step 5: Scrolling to Platform section")
        try:
            headings = driver.find_elements(By.TAG_NAME, "h2") + driver.find_elements(By.TAG_NAME, "h3")
            platform_heading = None
            for h in headings:
                if "platform" in h.text.lower() or "features" in h.text.lower():
                    platform_heading = h
                    break
            
            if platform_heading:
                driver.execute_script("arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});", platform_heading)
                time.sleep(1.5)
                driver.save_screenshot("screenshot-platform-section.png")
                print("  ✓ Saved screenshot-platform-section.png")
        except Exception as e:
            print(f"  ✗ Error: {e}")
        
        print("Step 6: Hovering over a platform card")
        try:
            cards = driver.find_elements(By.CSS_SELECTOR, ".group")
            if len(cards) > 1:
                actions.move_to_element(cards[1]).perform()
                time.sleep(0.5)
                driver.save_screenshot("screenshot-platform-card-hover.png")
                print("  ✓ Saved screenshot-platform-card-hover.png")
        except Exception as e:
            print(f"  ✗ Error: {e}")
        
        print("Step 7: Scrolling to Roles section")
        try:
            headings = driver.find_elements(By.TAG_NAME, "h2") + driver.find_elements(By.TAG_NAME, "h3")
            roles_heading = None
            for h in headings:
                if "role" in h.text.lower() or "who" in h.text.lower():
                    roles_heading = h
                    break
            
            if roles_heading:
                driver.execute_script("arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});", roles_heading)
                time.sleep(1.5)
                driver.save_screenshot("screenshot-roles-section.png")
                print("  ✓ Saved screenshot-roles-section.png")
        except Exception as e:
            print(f"  ✗ Error: {e}")
        
        print("Step 8: Hovering over a role card")
        try:
            cards = driver.find_elements(By.CSS_SELECTOR, ".group")
            if len(cards) > 2:
                actions.move_to_element(cards[2]).perform()
                time.sleep(0.5)
                driver.save_screenshot("screenshot-role-card-hover.png")
                print("  ✓ Saved screenshot-role-card-hover.png")
        except Exception as e:
            print(f"  ✗ Error: {e}")
        
        print("Step 9: Clicking a CTA button")
        try:
            buttons = driver.find_elements(By.TAG_NAME, "button") + driver.find_elements(By.TAG_NAME, "a")
            cta_button = None
            for btn in buttons:
                if "start as" in btn.text.lower():
                    cta_button = btn
                    break
            
            if cta_button:
                cta_button.click()
                time.sleep(2)
                driver.save_screenshot("screenshot-cta-navigation.png")
                print("  ✓ Saved screenshot-cta-navigation.png")
                driver.back()
                time.sleep(1)
        except Exception as e:
            print(f"  ✗ Error: {e}")
        
        print("Step 10: Scrolling to Workflow section")
        try:
            headings = driver.find_elements(By.TAG_NAME, "h2") + driver.find_elements(By.TAG_NAME, "h3")
            workflow_heading = None
            for h in headings:
                if "workflow" in h.text.lower() or "how" in h.text.lower() and "works" in h.text.lower():
                    workflow_heading = h
                    break
            
            if workflow_heading:
                driver.execute_script("arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});", workflow_heading)
                time.sleep(1.5)
                driver.save_screenshot("screenshot-workflow-section.png")
                print("  ✓ Saved screenshot-workflow-section.png")
        except Exception as e:
            print(f"  ✗ Error: {e}")
        
        print("\n✅ All screenshots captured successfully!")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
    finally:
        driver.quit()

if __name__ == "__main__":
    capture_screenshots()
