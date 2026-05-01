import urllib.request
req = urllib.request.Request('https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/ZTE_logo.svg/320px-ZTE_logo.svg.png', headers={'User-Agent': 'Mozilla/5.0'})
with open('assets/zte_logo.png', 'wb') as f:
    f.write(urllib.request.urlopen(req).read())
