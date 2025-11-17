run:
	bundle exec jekyll serve -l -H localhost
install:
	sudo apt install ruby-dev ruby-bundler nodejs
	bundle install
	npm install
