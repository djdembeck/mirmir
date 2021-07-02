require "test_helper"

class SourcesControllerTest < ActionDispatch::IntegrationTest
  test "should get new" do
    get sources_new_url
    assert_response :success
  end

  test "should get show" do
    get sources_show_url
    assert_response :success
  end

  test "should get index" do
    get sources_index_url
    assert_response :success
  end

  test "should get create" do
    get sources_create_url
    assert_response :success
  end

  test "should get destroy" do
    get sources_destroy_url
    assert_response :success
  end
end
