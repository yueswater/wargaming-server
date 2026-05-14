.PHONY: dev start install keep-online autoplay build build-baked clean

dev:
	npm run dev

start:
	npm run start

install:
	npm install

keep-online:
	bash game/keep-online.sh

autoplay:
	node game/autoplay.js

build:
	npx pkg game/autoplay-standalone.js \
		--targets node20-macos-arm64,node20-macos-x64,node20-win-x64,node20-linux-x64 \
		--out-path game/dist \
		--no-bytecode \
		--public \
		--compress GZip
	@mv game/dist/autoplay-standalone-linux-x64       game/dist/autoplay-linux-x64
	@mv game/dist/autoplay-standalone-macos-arm64     game/dist/autoplay-macos-arm64
	@mv game/dist/autoplay-standalone-macos-x64       game/dist/autoplay-macos-x64
	@mv game/dist/autoplay-standalone-win-x64.exe     game/dist/autoplay-win-x64.exe
	@echo ""
	@echo "打包完成 → game/dist/"
	@ls -lh game/dist/

build-baked:
	@node game/bake.js
	npx pkg game/_baked_entry.js \
		--targets node20-macos-arm64,node20-macos-x64,node20-win-x64,node20-linux-x64 \
		--out-path game/dist-baked \
		--no-bytecode \
		--public \
		--compress GZip
	@rm -f game/_baked_entry.js
	@mv game/dist-baked/_baked_entry-linux-x64       game/dist-baked/autoplay-linux-x64
	@mv game/dist-baked/_baked_entry-macos-arm64     game/dist-baked/autoplay-macos-arm64
	@mv game/dist-baked/_baked_entry-macos-x64       game/dist-baked/autoplay-macos-x64
	@mv game/dist-baked/_baked_entry-win-x64.exe     game/dist-baked/autoplay-win-x64.exe
	@echo ""
	@echo "打包完成 → game/dist-baked/"
	@ls -lh game/dist-baked/

clean:
	rm -rf node_modules
