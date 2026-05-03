import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse

class ScraperService:
    @staticmethod
    def is_valid_url(url, base_domain):
        parsed = urlparse(url)
        return bool(parsed.netloc == base_domain and not parsed.fragment)

    @staticmethod
    def scrape_url(base_url: str, max_pages: int = 5):
        """
        Shallow crawl a website starting from base_url.
        Limits to max_pages to avoid going too deep.
        """
        visited = set()
        to_visit = [base_url]
        base_domain = urlparse(base_url).netloc
        all_text = ""

        while to_visit and len(visited) < max_pages:
            url = to_visit.pop(0)
            if url in visited:
                continue
            
            try:
                response = requests.get(url, timeout=10)
                if response.status_code != 200:
                    continue
                
                soup = BeautifulSoup(response.text, 'html.parser')
                visited.add(url)
                
                # Clean up the soup
                for script_or_style in soup(['script', 'style', 'header', 'footer', 'nav']):
                    script_or_style.decompose()
                
                text = soup.get_text(separator=' ', strip=True)
                all_text += f"\n--- Source: {url} ---\n{text}\n"
                
                # Find links for shallow crawl
                for link in soup.find_all('a', href=True):
                    full_url = urljoin(base_url, link['href'])
                    if ScraperService.is_valid_url(full_url, base_domain):
                        if full_url not in visited:
                            to_visit.append(full_url)
                            
            except Exception as e:
                print(f"Error scraping {url}: {e}")
                
        return all_text
